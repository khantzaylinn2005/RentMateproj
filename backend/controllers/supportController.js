const { pool } = require('../config/database');

let supportTablesInitialized = false;

async function ensureSupportTables() {
  if (supportTablesInitialized) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      subject VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      priority ENUM('normal', 'high') DEFAULT 'normal',
      status ENUM('open', 'in_progress', 'resolved') DEFAULT 'open',
      admin_response TEXT,
      admin_id INT DEFAULT NULL,
      resolved_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_user (user_id),
      INDEX idx_status (status),
      INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_ticket_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_id INT NOT NULL,
      sender_id INT NOT NULL,
      sender_role ENUM('user', 'admin') NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_ticket (ticket_id),
      INDEX idx_sender (sender_id),
      INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  supportTablesInitialized = true;
}

exports.createTicket = async (req, res) => {
  try {
    await ensureSupportTables();

    const { subject, message, priority } = req.body;
    const userId = req.user.id;

    if (!subject || !subject.trim() || !message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required'
      });
    }

    const ticketPriority = priority === 'high' ? 'high' : 'normal';

    const [result] = await pool.query(
      `INSERT INTO support_tickets (user_id, subject, message, priority) VALUES (?, ?, ?, ?)` ,
      [userId, subject.trim(), message.trim(), ticketPriority]
    );

    const ticketId = result.insertId;

    await pool.query(
      `INSERT INTO support_ticket_messages (ticket_id, sender_id, sender_role, message)
       VALUES (?, ?, 'user', ?)` ,
      [ticketId, userId, message.trim()]
    );

    // Notify all admins about the new ticket
    const [admins] = await pool.query('SELECT id FROM users WHERE role = "admin"');
    const notificationTitle = 'New Support Ticket';
    const notificationMessage = `${req.user.name || 'A user'} opened a support ticket: ${subject.trim()}`;

    await Promise.all(
      admins.map(admin => pool.query(
        `INSERT INTO notifications (user_id, rental_id, type, title, message)
         VALUES (?, NULL, 'support_ticket', ?, ?)` ,
        [admin.id, notificationTitle, notificationMessage]
      ))
    );

    const [ticketRows] = await pool.query(
      `SELECT st.*, u.name as user_name, u.email as user_email
         FROM support_tickets st
         JOIN users u ON st.user_id = u.id
         WHERE st.id = ?
         LIMIT 1`,
      [ticketId]
    );

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: ticketRows[0]
    });
  } catch (error) {
    console.error('Create support ticket error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create ticket'
    });
  }
};

exports.getMyTickets = async (req, res) => {
  try {
    await ensureSupportTables();

    const userId = req.user.id;

    const [tickets] = await pool.query(
      `SELECT id, subject, message, priority, status, admin_response, resolved_at, created_at, updated_at
         FROM support_tickets
         WHERE user_id = ?
         ORDER BY created_at DESC` ,
      [userId]
    );

    res.json({
      success: true,
      data: tickets
    });
  } catch (error) {
    console.error('Get support tickets error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load tickets'
    });
  }
};

exports.getAllTickets = async (req, res) => {
  try {
    await ensureSupportTables();

    const [tickets] = await pool.query(
      `SELECT st.*, u.name as user_name, u.email as user_email
         FROM support_tickets st
         JOIN users u ON st.user_id = u.id
         ORDER BY st.status != 'open', st.created_at DESC`
    );

    res.json({
      success: true,
      data: tickets
    });
  } catch (error) {
    console.error('Admin get support tickets error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load tickets'
    });
  }
};

exports.updateTicketStatus = async (req, res) => {
  try {
    await ensureSupportTables();

    const ticketId = req.params.id;
    const { status, adminResponse } = req.body;
    const adminId = req.user.id;

    const allowedStatuses = ['open', 'in_progress', 'resolved'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const updates = [];
    const params = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
      if (status === 'resolved') {
        updates.push('resolved_at = NOW()');
      }
    }

    const trimmedAdminResponse = typeof adminResponse === 'string' ? adminResponse.trim() : undefined;

    if (trimmedAdminResponse !== undefined) {
      updates.push('admin_response = ?');
      params.push(trimmedAdminResponse);
    }

    updates.push('admin_id = ?');
    params.push(adminId);

    params.push(ticketId);

    await pool.query(
      `UPDATE support_tickets SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?` ,
      params
    );

    const [updatedTicket] = await pool.query(
      `SELECT st.*, u.name as user_name, u.email as user_email
         FROM support_tickets st
         JOIN users u ON st.user_id = u.id
         WHERE st.id = ?
         LIMIT 1`,
      [ticketId]
    );

    if (updatedTicket.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    const ticketData = updatedTicket[0];

    if (trimmedAdminResponse) {
      await pool.query(
        `INSERT INTO support_ticket_messages (ticket_id, sender_id, sender_role, message)
         VALUES (?, ?, 'admin', ?)` ,
        [ticketId, adminId, trimmedAdminResponse]
      );

      const summary = trimmedAdminResponse.length > 140
        ? `${trimmedAdminResponse.slice(0, 137)}...`
        : trimmedAdminResponse;

      await pool.query(
        `INSERT INTO notifications (user_id, rental_id, type, title, message)
         VALUES (?, NULL, 'support_ticket_reply', 'Support Response', ?)` ,
        [ticketData.user_id, `The admin replied: ${summary}`]
      );
    }

    res.json({
      success: true,
      message: 'Ticket updated successfully',
      data: updatedTicket[0]
    });
  } catch (error) {
    console.error('Update support ticket error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update ticket'
    });
  }
};

exports.getTicketMessages = async (req, res) => {
  try {
    await ensureSupportTables();

    const ticketId = req.params.id;
    const requesterId = req.user.id;
    const requesterRole = req.user.role;

    const [tickets] = await pool.query(
      'SELECT * FROM support_tickets WHERE id = ? LIMIT 1',
      [ticketId]
    );

    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    const ticket = tickets[0];

    if (requesterRole !== 'admin' && ticket.user_id !== requesterId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this ticket'
      });
    }

    const [messages] = await pool.query(
      `SELECT stm.*, u.name as sender_name
         FROM support_ticket_messages stm
         JOIN users u ON stm.sender_id = u.id
         WHERE stm.ticket_id = ?
         ORDER BY stm.created_at ASC`,
      [ticketId]
    );

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Get ticket messages error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load messages'
    });
  }
};

exports.addTicketReply = async (req, res) => {
  try {
    await ensureSupportTables();

    const ticketId = req.params.id;
    const { message, status } = req.body;
    const senderId = req.user.id;
    const senderRole = req.user.role === 'admin' ? 'admin' : 'user';

    const trimmedMessage = typeof message === 'string' ? message.trim() : '';
    if (!trimmedMessage) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const [tickets] = await pool.query(
      'SELECT * FROM support_tickets WHERE id = ? LIMIT 1',
      [ticketId]
    );

    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    const ticket = tickets[0];

    if (senderRole !== 'admin' && ticket.user_id !== senderId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reply to this ticket'
      });
    }

    if (senderRole === 'user' && ticket.status === 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'This ticket is resolved. Please open a new ticket if you need more help.'
      });
    }

    const [insertResult] = await pool.query(
      `INSERT INTO support_ticket_messages (ticket_id, sender_id, sender_role, message)
       VALUES (?, ?, ?, ?)` ,
      [ticketId, senderId, senderRole, trimmedMessage]
    );

    const ticketUpdates = [];
    const updateParams = [];

    if (senderRole === 'user') {
      if (ticket.status === 'resolved') {
        ticketUpdates.push('status = ?');
        updateParams.push('open');
        ticketUpdates.push('resolved_at = NULL');
      }
    } else if (senderRole === 'admin') {
      ticketUpdates.push('admin_response = ?');
      updateParams.push(trimmedMessage);
      ticketUpdates.push('admin_id = ?');
      updateParams.push(senderId);

      if (status && ['open', 'in_progress', 'resolved'].includes(status)) {
        ticketUpdates.push('status = ?');
        updateParams.push(status);
        if (status === 'resolved') {
          ticketUpdates.push('resolved_at = NOW()');
        } else {
          ticketUpdates.push('resolved_at = NULL');
        }
      } else if (ticket.status === 'open') {
        ticketUpdates.push('status = ?');
        updateParams.push('in_progress');
      }
    }

    ticketUpdates.push('updated_at = NOW()');

    if (ticketUpdates.length > 0) {
      updateParams.push(ticketId);
      await pool.query(
        `UPDATE support_tickets SET ${ticketUpdates.join(', ')} WHERE id = ?` ,
        updateParams
      );
    }

    if (senderRole === 'admin') {
      const summary = trimmedMessage.length > 140
        ? `${trimmedMessage.slice(0, 137)}...`
        : trimmedMessage;

      await pool.query(
        `INSERT INTO notifications (user_id, rental_id, type, title, message)
         VALUES (?, NULL, 'support_ticket_reply', 'Support Response', ?)` ,
        [ticket.user_id, `The admin replied: ${summary}`]
      );
    } else {
      const [admins] = await pool.query('SELECT id FROM users WHERE role = "admin"');
      const summary = trimmedMessage.length > 140
        ? `${trimmedMessage.slice(0, 137)}...`
        : trimmedMessage;

      await Promise.all(
        admins.map(admin => pool.query(
          `INSERT INTO notifications (user_id, rental_id, type, title, message)
           VALUES (?, NULL, 'support_ticket_reply', 'New Support Reply', ?)` ,
          [admin.id, `User replied on ticket #${ticketId}: ${summary}`]
        ))
      );
    }

    const [messageRow] = await pool.query(
      `SELECT stm.*, u.name as sender_name
         FROM support_ticket_messages stm
         JOIN users u ON stm.sender_id = u.id
         WHERE stm.id = ?
         LIMIT 1`,
      [insertResult.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Reply added successfully',
      data: messageRow[0]
    });
  } catch (error) {
    console.error('Add ticket reply error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add reply'
    });
  }
};
