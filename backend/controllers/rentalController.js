const { pool } = require('../config/database');

async function generateRentalId() {
  const [rows] = await pool.query('SELECT rental_id FROM rentals ORDER BY id DESC LIMIT 1');
  if (rows.length === 0) {
    return 'RNT000001';
  }
  const lastId = rows[0].rental_id;
  const num = parseInt(lastId.replace('RNT', '')) + 1;
  return `RNT${String(num).padStart(6, '0')}`;
}

exports.createRental = async (req, res) => {
  try {
    // Support both camelCase and snake_case
    const itemId = req.body.itemId || req.body.item_id;
    const startDate = req.body.startDate || req.body.start_date;
    const endDate = req.body.endDate || req.body.end_date;
    
    if (!itemId || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Missing required fields: item_id, start_date, end_date' });
    }
    
    const [items] = await pool.query('SELECT * FROM items WHERE id = ?', [itemId]);
    
    if (items.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const item = items[0];

    if (!item.available) {
      return res.status(400).json({ success: false, message: 'Item is not available for rent' });
    }

    if (item.owner_id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot rent your own item' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const totalPrice = days * item.price;
    const rentalId = await generateRentalId();

    const [result] = await pool.query(
      'INSERT INTO rentals (rental_id, item_id, borrower_id, lender_id, start_date, end_date, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [rentalId, itemId, req.user.id, item.owner_id, startDate, endDate, totalPrice, 'pending']
    );

    res.status(201).json({
      success: true,
      message: 'Rental request created successfully',
      data: { id: result.insertId, rentalId, itemId, startDate, endDate, totalPrice, status: 'pending' }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllRentals = async (req, res) => {
  try {
    const [rentals] = await pool.query(
      `SELECT r.*, i.name as itemName, i.images, i.price,
       b.name as borrowerName, b.email as borrowerEmail,
       l.name as lenderName, l.email as lenderEmail
       FROM rentals r
       JOIN items i ON r.item_id = i.id
       JOIN users b ON r.borrower_id = b.id
       JOIN users l ON r.lender_id = l.id
       ORDER BY r.created_at DESC`
    );
    res.json({ success: true, count: rentals.length, data: rentals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyBorrowing = async (req, res) => {
  try {
    const [rentals] = await pool.query(
      `SELECT r.*, i.name as itemName, i.images, i.price,
       u.name as lenderName, u.email as lenderEmail, u.phone as lenderPhone
       FROM rentals r
       JOIN items i ON r.item_id = i.id
       JOIN users u ON r.lender_id = u.id
       WHERE r.borrower_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, count: rentals.length, data: rentals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyLending = async (req, res) => {
  try {
    const [rentals] = await pool.query(
      `SELECT r.*, i.name as itemName, i.images, i.price,
       u.name as borrowerName, u.email as borrowerEmail, u.phone as borrowerPhone
       FROM rentals r
       JOIN items i ON r.item_id = i.id
       JOIN users u ON r.borrower_id = u.id
       WHERE r.lender_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, count: rentals.length, data: rentals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateRentalStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const [rentals] = await pool.query('SELECT * FROM rentals WHERE id = ?', [req.params.id]);

    if (rentals.length === 0) {
      return res.status(404).json({ success: false, message: 'Rental not found' });
    }

    const rental = rentals[0];

    if (status === 'approved' || status === 'rejected') {
      if (rental.lender_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(401).json({ success: false, message: 'Not authorized' });
      }
    }

    if (status === 'cancelled') {
      if (rental.borrower_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(401).json({ success: false, message: 'Not authorized' });
      }
    }

    await pool.query('UPDATE rentals SET status = ? WHERE id = ?', [status, req.params.id]);

    if (status === 'approved') {
      await pool.query('UPDATE items SET available = false WHERE id = ?', [rental.item_id]);
    }

    if (status === 'completed' || status === 'cancelled') {
      await pool.query('UPDATE items SET available = true WHERE id = ?', [rental.item_id]);
    }

    res.json({ success: true, message: 'Rental status updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteRental = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM rentals WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Rental not found' });
    }

    res.json({ success: true, message: 'Rental deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Confirm item return by lender
exports.confirmReturn = async (req, res) => {
  try {
    const { rental_id } = req.body;
    const userId = req.user.id;

    // Verify lender
    const [rentals] = await pool.query(
      'SELECT * FROM rentals WHERE id = ? AND lender_id = ?',
      [rental_id, userId]
    );

    if (rentals.length === 0) {
      return res.status(404).json({ success: false, message: 'Rental not found or unauthorized' });
    }

    // Update rental
    await pool.query(
      `UPDATE rentals 
       SET return_confirmed_by_lender = 1,
           item_returned_at = NOW(),
           status = 'completed'
       WHERE id = ?`,
      [rental_id]
    );

    const rental = rentals[0];

    // Add progress
    await pool.query(
      `INSERT INTO rental_progress (rental_id, status_type, description, created_by)
       VALUES (?, 'return_confirmed', 'Item return confirmed by lender', ?)`,
      [rental_id, userId]
    );

    // Notify admin for deposit refund
    const [admins] = await pool.query('SELECT id FROM users WHERE role = "admin"');
    for (const admin of admins) {
      await pool.query(
        `INSERT INTO notifications (user_id, rental_id, type, title, message)
         VALUES (?, ?, 'return_confirmed', 'Item Returned', 'Lender confirmed item return. Please process deposit refund.')`,
        [admin.id, rental_id]
      );
    }

    // Notify borrower
    await pool.query(
      `INSERT INTO notifications (user_id, rental_id, type, title, message)
       VALUES (?, ?, 'return_confirmed', 'Return Confirmed', 'Lender confirmed receiving the item. Deposit will be refunded soon.')`,
      [rental.borrower_id, rental_id]
    );

    // Notify borrower to review the lender
    await pool.query(
      `INSERT INTO notifications (user_id, rental_id, type, title, message)
       VALUES (?, ?, 'review_pending', 'Review Your Lender', 'Please share your experience and rate your lender for this completed rental.')`,
      [rental.borrower_id, rental_id]
    );

    // Notify lender to review the borrower
    await pool.query(
      `INSERT INTO notifications (user_id, rental_id, type, title, message)
       VALUES (?, ?, 'review_pending', 'Review Your Borrower', 'Please share your experience and rate your borrower for this completed rental.')`,
      [rental.lender_id, rental_id]
    );

    res.json({ success: true, message: 'Item return confirmed successfully' });

  } catch (error) {
    console.error('Confirm return error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get rental progress
exports.getRentalProgress = async (req, res) => {
  try {
    const { rental_id } = req.params;
    const userId = req.user.id;

    // Verify access (borrower, lender, or admin)
    const [rentals] = await pool.query(
      `SELECT r.*, i.name as itemName, i.images, i.price,
       b.name as borrowerName, b.email as borrowerEmail,
       l.name as lenderName, l.email as lenderEmail
       FROM rentals r
       JOIN items i ON r.item_id = i.id
       JOIN users b ON r.borrower_id = b.id
       JOIN users l ON r.lender_id = l.id
       WHERE r.id = ?`,
      [rental_id]
    );

    if (rentals.length === 0) {
      return res.status(404).json({ success: false, message: 'Rental not found' });
    }

    const rental = rentals[0];
    const isAdmin = req.user.role === 'admin';
    const isParty = rental.borrower_id === userId || rental.lender_id === userId;

    if (!isAdmin && !isParty) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Get progress
    const [progress] = await pool.query(
      `SELECT p.*, u.name as created_by_name
       FROM rental_progress p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.rental_id = ?
       ORDER BY p.created_at ASC`,
      [rental_id]
    );

    res.json({ 
      success: true, 
      data: {
        rental,
        progress
      }
    });

  } catch (error) {
    console.error('Get rental progress error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get my chat conversations
exports.getMyChats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rentals] = await pool.query(
      `SELECT DISTINCT
        r.id as rental_id,
        r.workflow_status,
        i.name as itemName,
        CASE 
          WHEN r.borrower_id = ? THEN l.name
          WHEN r.lender_id = ? THEN b.name
        END as otherUserName,
        CASE 
          WHEN r.borrower_id = ? THEN l.id
          WHEN r.lender_id = ? THEN b.id
        END as otherUserId,
        (SELECT message_text FROM chat_messages WHERE rental_id = r.id ORDER BY created_at DESC LIMIT 1) as lastMessage,
        (SELECT created_at FROM chat_messages WHERE rental_id = r.id ORDER BY created_at DESC LIMIT 1) as lastMessageTime,
        (SELECT COUNT(*) FROM chat_messages WHERE rental_id = r.id AND is_read = 0 AND sender_id != ?) as unreadCount
      FROM rentals r
      JOIN items i ON r.item_id = i.id
      JOIN users b ON r.borrower_id = b.id
      JOIN users l ON r.lender_id = l.id
      WHERE (r.borrower_id = ? OR r.lender_id = ?)
        AND r.workflow_status IN ('payment_made', 'approved', 'active', 'item_transferred', 'item_returned', 'completed')
      ORDER BY lastMessageTime DESC`,
      [userId, userId, userId, userId, userId, userId, userId]
    );

    res.json({
      success: true,
      data: rentals
    });

  } catch (error) {
    console.error('Get my chats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
