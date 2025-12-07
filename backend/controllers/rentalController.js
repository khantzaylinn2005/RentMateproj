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
      'INSERT INTO rentals (rental_id, item_id, borrower_id, lender_id, start_date, end_date, total_price, status, workflow_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [rentalId, itemId, req.user.id, item.owner_id, startDate, endDate, totalPrice, 'pending', 'payment_pending']
    );

    res.status(201).json({
      success: true,
      message: 'Rental request created successfully',
      data: { id: result.insertId, rentalId, itemId, startDate, endDate, totalPrice, status: 'pending', workflow_status: 'payment_pending' }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateRefundBankInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      bank_acc_name: rawBankAccName,
      bank_number: rawBankNumber,
      bank_name: rawBankName,
      bank_book_photo: bankBookPhoto
    } = req.body;

    const bankAccName = (rawBankAccName || '').trim();
    const bankNumber = (rawBankNumber || '').trim();
    const bankName = (rawBankName || '').trim();

    if (!bankAccName || !bankNumber || !bankName) {
      return res.status(400).json({
        success: false,
        message: 'Bank account name, number, and bank name are required'
      });
    }

    const [rentals] = await pool.query(
      'SELECT borrower_id, refund_bank_photo FROM rentals WHERE id = ? LIMIT 1',
      [id]
    );

    if (rentals.length === 0) {
      return res.status(404).json({ success: false, message: 'Rental not found' });
    }

    const rental = rentals[0];
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && rental.borrower_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update refund details for this rental' });
    }

    const photoValue = typeof bankBookPhoto === 'string' && bankBookPhoto.trim().length > 0
      ? bankBookPhoto
      : rental.refund_bank_photo || null;

    await pool.query(
      `UPDATE rentals 
       SET refund_bank_acc_name = ?,
           refund_bank_number = ?,
           refund_bank_name = ?,
           refund_bank_photo = ?
       WHERE id = ?`,
      [bankAccName, bankNumber, bankName, photoValue, id]
    );

    await pool.query(
      `UPDATE users 
       SET bank_acc_name = ?,
           bank_number = ?,
           bank_name = ?
       WHERE id = ?`,
      [bankAccName, bankNumber, bankName, rental.borrower_id]
    );

    const [updatedRentalRows] = await pool.query(
      'SELECT * FROM rentals WHERE id = ? LIMIT 1',
      [id]
    );

    const updatedRental = updatedRentalRows[0];

    const [updatedUserRows] = await pool.query(
      `SELECT id, name, email, location, phone, passport_no, role, rating, total_ratings, is_verified, bank_acc_name, bank_number, bank_name, qr_code, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [rental.borrower_id]
    );

    const updatedUser = updatedUserRows[0];

    res.json({
      success: true,
      message: 'Refund bank information saved successfully',
      data: {
        rental: updatedRental,
        user: updatedUser
      }
    });
  } catch (error) {
    console.error('Update refund bank info error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllRentals = async (req, res) => {
  try {
    const [rentals] = await pool.query(
      `SELECT r.*, i.name as itemName, i.images, i.price,
       b.name as borrowerName, b.email as borrowerEmail,
       b.bank_name as borrowerBankName, b.bank_number as borrowerBankNumber, 
       b.bank_acc_name as borrowerBankAccName, b.qr_code as borrowerQrCode,
       l.name as lenderName, l.email as lenderEmail,
       l.bank_name as lenderBankName, l.bank_number as lenderBankNumber, 
       l.bank_acc_name as lenderBankAccName, l.qr_code as lenderQrCode,
       p.payment_slip, p.payment_method, p.status as payment_status, p.created_at as payment_date,
       fp.lender_payment_slip as admin_lender_payment_slip,
       fp.refund_slip as admin_refund_slip
       FROM rentals r
       JOIN items i ON r.item_id = i.id
       JOIN users b ON r.borrower_id = b.id
       JOIN users l ON r.lender_id = l.id
       LEFT JOIN payments p ON r.id = p.rental_id AND p.payment_type = 'rental'
       LEFT JOIN final_payments fp ON r.id = fp.rental_id
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
       u.name as lenderName, u.email as lenderEmail, u.phone as lenderPhone,
       p.payment_slip, p.payment_method, p.status as payment_status, p.created_at as payment_date
       FROM rentals r
       JOIN items i ON r.item_id = i.id
       JOIN users u ON r.lender_id = u.id
       LEFT JOIN payments p ON r.id = p.rental_id AND p.payment_type = 'rental'
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
       u.name as borrowerName, u.email as borrowerEmail, u.phone as borrowerPhone,
       p.payment_slip, p.payment_method, p.status as payment_status, p.created_at as payment_date
       FROM rentals r
       JOIN items i ON r.item_id = i.id
       JOIN users u ON r.borrower_id = u.id
       LEFT JOIN payments p ON r.id = p.rental_id AND p.payment_type = 'rental'
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

// Step 2: Lender confirms item was lended (transferred)
exports.confirmItemLended = async (req, res) => {
  try {
    const { rental_id, lender_transfer_photo } = req.body;
    const userId = req.user.id;

    // Verify lender
    const [rentals] = await pool.query(
      'SELECT * FROM rentals WHERE id = ? AND lender_id = ?',
      [rental_id, userId]
    );

    if (rentals.length === 0) {
      return res.status(404).json({ success: false, message: 'Rental not found or unauthorized' });
    }

    const rental = rentals[0];

    if (!lender_transfer_photo) {
      return res.status(400).json({
        success: false,
        message: 'A handover photo is required to confirm the item was lended'
      });
    }

    // Check if payment is approved
    if (rental.workflow_status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Payment must be approved first' });
    }

    // Update rental
    await pool.query(
      `UPDATE rentals 
       SET lender_confirmed_transfer = TRUE,
           lender_confirmed_transfer_at = NOW(),
           workflow_status = 'lender_confirmed',
           lender_transfer_photo = ?
       WHERE id = ?`,
      [lender_transfer_photo, rental_id]
    );

    // Add progress
    await pool.query(
      `INSERT INTO rental_progress (rental_id, status_type, description, created_by)
       VALUES (?, 'lender_confirmed', 'Lender confirmed item was lended', ?)`,
      [rental_id, userId]
    );

    // Notify borrower
    await pool.query(
      `INSERT INTO notifications (user_id, rental_id, type, title, message)
       VALUES (?, ?, 'item_lended', 'Item Lended', 'Lender confirmed they have lended the item. Please confirm when you receive it.')`,
      [rental.borrower_id, rental_id]
    );

    res.json({ success: true, message: 'Item lended confirmed successfully' });

  } catch (error) {
    console.error('Confirm item lended error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Step 3: Borrower confirms receiving item
exports.confirmItemReceived = async (req, res) => {
  try {
    const { rental_id, borrower_receive_photo } = req.body;
    const userId = req.user.id;

    // Verify borrower
    const [rentals] = await pool.query(
      'SELECT * FROM rentals WHERE id = ? AND borrower_id = ?',
      [rental_id, userId]
    );

    if (rentals.length === 0) {
      return res.status(404).json({ success: false, message: 'Rental not found or unauthorized' });
    }

    const rental = rentals[0];

    // Check if lender confirmed transfer
    if (!rental.lender_confirmed_transfer) {
      return res.status(400).json({ success: false, message: 'Lender must confirm item transfer first' });
    }

    if (!borrower_receive_photo) {
      return res.status(400).json({
        success: false,
        message: 'A photo proof is required to confirm you received the item'
      });
    }

    // Update rental
    await pool.query(
      `UPDATE rentals 
       SET borrower_confirmed_receipt = TRUE,
           borrower_confirmed_receipt_at = NOW(),
           borrower_receive_photo = ?,
           workflow_status = 'active'
       WHERE id = ?`,
      [borrower_receive_photo, rental_id]
    );

    // Add progress
    await pool.query(
      `INSERT INTO rental_progress (rental_id, status_type, description, created_by)
       VALUES (?, 'borrower_received', 'Borrower confirmed receiving the item with proof photo', ?)`,
      [rental_id, userId]
    );

    // Notify lender
    await pool.query(
      `INSERT INTO notifications (user_id, rental_id, type, title, message)
       VALUES (?, ?, 'item_received', 'Item Handed Over', 'Borrower confirmed receiving your item in good condition. The rental is now active.')`,
      [rental.lender_id, rental_id]
    );

    res.json({ success: true, message: 'Item receipt confirmed successfully' });

  } catch (error) {
    console.error('Confirm item received error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Step 4: Borrower confirms returning item
exports.confirmItemReturn = async (req, res) => {
  try {
    const { rental_id, borrower_return_photo } = req.body;
    const userId = req.user.id;

    // Verify borrower
    const [rentals] = await pool.query(
      'SELECT * FROM rentals WHERE id = ? AND borrower_id = ?',
      [rental_id, userId]
    );

    if (rentals.length === 0) {
      return res.status(404).json({ success: false, message: 'Rental not found or unauthorized' });
    }

    const rental = rentals[0];

    // Check if item was received
    if (!rental.borrower_confirmed_receipt) {
      return res.status(400).json({ success: false, message: 'You must confirm receiving the item first' });
    }

    // Update rental with borrower's return photo
    const updateQuery = borrower_return_photo 
      ? `UPDATE rentals 
         SET borrower_confirmed_return = TRUE,
             borrower_confirmed_return_at = NOW(),
             borrower_return_photo = ?,
             workflow_status = 'borrower_returned'
         WHERE id = ?`
      : `UPDATE rentals 
         SET borrower_confirmed_return = TRUE,
             borrower_confirmed_return_at = NOW(),
             workflow_status = 'borrower_returned'
         WHERE id = ?`;
    
    const updateParams = borrower_return_photo 
      ? [borrower_return_photo, rental_id]
      : [rental_id];

    await pool.query(updateQuery, updateParams);

    // Add progress
    await pool.query(
      `INSERT INTO rental_progress (rental_id, status_type, description, created_by)
       VALUES (?, 'borrower_returned', 'Borrower confirmed returning the item', ?)`,
      [rental_id, userId]
    );

    // Notify lender
    await pool.query(
      `INSERT INTO notifications (user_id, rental_id, type, title, message)
       VALUES (?, ?, 'item_returning', 'Item Returning', 'Borrower confirmed returning the item. Please confirm when you receive it back.')`,
      [rental.lender_id, rental_id]
    );

    res.json({ success: true, message: 'Item return confirmed successfully' });

  } catch (error) {
    console.error('Confirm item return error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Step 5: Lender confirms receiving item back
exports.confirmReturnReceived = async (req, res) => {
  try {
    const { rental_id, return_photo, lender_return_photo } = req.body;
    const userId = req.user.id;

    const submittedPhoto = return_photo || lender_return_photo || null;

    console.log('Confirm return received request:', { rental_id, userId, hasPhoto: !!submittedPhoto });

    // Verify lender
    const [rentals] = await pool.query(
      'SELECT * FROM rentals WHERE id = ? AND lender_id = ?',
      [rental_id, userId]
    );

    if (rentals.length === 0) {
      return res.status(404).json({ success: false, message: 'Rental not found or unauthorized' });
    }

    const rental = rentals[0];

    // Check if borrower confirmed return
    if (!rental.borrower_confirmed_return) {
      return res.status(400).json({ success: false, message: 'Borrower must confirm return first' });
    }

    // Update rental with lender's return photo if provided
    if (submittedPhoto) {
      await pool.query(
        `UPDATE rentals 
         SET lender_confirmed_return = TRUE,
             lender_confirmed_return_at = NOW(),
             workflow_status = 'return_completed',
             lender_return_photo = ?
         WHERE id = ?`,
        [submittedPhoto, rental_id]
      );
    } else {
      await pool.query(
        `UPDATE rentals 
         SET lender_confirmed_return = TRUE,
             lender_confirmed_return_at = NOW(),
             workflow_status = 'return_completed'
         WHERE id = ?`,
        [rental_id]
      );
    }

    // Add progress
    await pool.query(
      `INSERT INTO rental_progress (rental_id, status_type, description, created_by)
       VALUES (?, 'return_completed', 'Lender confirmed receiving item back', ?)`,
      [rental_id, userId]
    );

    // Notify admin for final payment processing
    const [admins] = await pool.query('SELECT id FROM users WHERE role = "admin"');
    for (const admin of admins) {
      await pool.query(
        `INSERT INTO notifications (user_id, rental_id, type, title, message)
         VALUES (?, ?, 'return_confirmed', 'Item Returned', 'Lender confirmed item return. Please process final payments (lender fee + borrower deposit refund).')`,
        [admin.id, rental_id]
      );
    }

    // Notify borrower
    await pool.query(
      `INSERT INTO notifications (user_id, rental_id, type, title, message)
       VALUES (?, ?, 'return_confirmed', 'Return Confirmed', 'Lender confirmed receiving the item. Admin will process deposit refund soon.')`,
      [rental.borrower_id, rental_id]
    );

    res.json({ success: true, message: 'Item return received confirmed successfully' });

  } catch (error) {
    console.error('Confirm return received error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Legacy function - kept for compatibility
exports.confirmReturn = async (req, res) => {
  // Redirect to new function
  return exports.confirmReturnReceived(req, res);
};

// Get rental progress
exports.getRentalProgress = async (req, res) => {
  try {
    const { rental_id: rentalIdentifier } = req.params;
    const userId = req.user.id;

    if (!rentalIdentifier || rentalIdentifier === 'null' || rentalIdentifier === 'undefined') {
      return res.status(400).json({ success: false, message: 'Rental identifier is required' });
    }

    // Verify access (borrower, lender, or admin)
    const [rentals] = await pool.query(
      `SELECT r.*, i.name as itemName, i.images, i.price,
       b.name as borrowerName, b.email as borrowerEmail,
       l.name as lenderName, l.email as lenderEmail,
       p.payment_slip, p.payment_method,
       fp.lender_payment_slip as admin_lender_payment_slip,
      fp.refund_slip as admin_refund_slip,
      fp.refund_amount as admin_refund_amount
       FROM rentals r
       JOIN items i ON r.item_id = i.id
       JOIN users b ON r.borrower_id = b.id
       JOIN users l ON r.lender_id = l.id
       LEFT JOIN payments p ON r.id = p.rental_id AND p.payment_type = 'rental'
       LEFT JOIN final_payments fp ON r.id = fp.rental_id
       WHERE r.id = ? OR r.rental_id = ?`,
      [rentalIdentifier, rentalIdentifier]
    );

    if (rentals.length === 0) {
      return res.status(404).json({ success: false, message: 'Rental not found' });
    }

    const rental = rentals[0];
    const rentalPrimaryId = rental.id;
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
      [rentalPrimaryId]
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

// Reject rental request
exports.rejectRental = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, refund_slip } = req.body;
    const adminId = req.user.id;

    // Get rental details
    const [rentals] = await pool.query(
      'SELECT * FROM rentals WHERE id = ?',
      [id]
    );

    if (rentals.length === 0) {
      return res.status(404).json({ success: false, message: 'Rental not found' });
    }

    const rental = rentals[0];

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    if (!refund_slip) {
      return res.status(400).json({ success: false, message: 'Refund slip image is required when rejecting' });
    }

    // Update rental status to rejected
    await pool.query(
      `UPDATE rentals 
       SET workflow_status = 'rejected',
           rejection_reason = ?,
           rejected_by = ?,
           rejected_at = NOW(),
           admin_reject_refund_slip = ?
       WHERE id = ?`,
      [reason, adminId, refund_slip, id]
    );

    // Track progress event so admins can audit rejection decisions
    await pool.query(
      `INSERT INTO rental_progress (rental_id, status_type, description, created_by)
       VALUES (?, 'rejected', ?, ?)`,
      [id, `Rental rejected by admin. Reason: ${reason}`, adminId]
    );

    // Notify borrower
    await pool.query(
      `INSERT INTO notifications (user_id, rental_id, type, title, message)
       VALUES (?, ?, 'rental_rejected', 'Rental Request Rejected', ?)`,
      [rental.borrower_id, id, `Your rental request has been rejected. Reason: ${reason}`]
    );

    // Notify lender
    await pool.query(
      `INSERT INTO notifications (user_id, rental_id, type, title, message)
       VALUES (?, ?, 'rental_rejected', 'Rental Request Rejected', ?)`,
      [rental.lender_id, id, 'A rental request for your item has been rejected by admin.']
    );

    res.json({
      success: true,
      message: 'Rental rejected successfully'
    });

  } catch (error) {
    console.error('Reject rental error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get my chat conversations
exports.getMyChats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rentals] = await pool.query(
      `SELECT 
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
        (SELECT message_text FROM chat_messages cm WHERE cm.rental_id IN 
          (SELECT r2.id FROM rentals r2 
           WHERE (r2.borrower_id = ? AND r2.lender_id = CASE WHEN r.borrower_id = ? THEN r.lender_id ELSE r.borrower_id END)
              OR (r2.lender_id = ? AND r2.borrower_id = CASE WHEN r.borrower_id = ? THEN r.lender_id ELSE r.borrower_id END))
         ORDER BY cm.created_at DESC LIMIT 1) as lastMessage,
        (SELECT cm.created_at FROM chat_messages cm WHERE cm.rental_id IN 
          (SELECT r2.id FROM rentals r2 
           WHERE (r2.borrower_id = ? AND r2.lender_id = CASE WHEN r.borrower_id = ? THEN r.lender_id ELSE r.borrower_id END)
              OR (r2.lender_id = ? AND r2.borrower_id = CASE WHEN r.borrower_id = ? THEN r.lender_id ELSE r.borrower_id END))
         ORDER BY cm.created_at DESC LIMIT 1) as lastMessageTime,
        (SELECT COUNT(*) FROM chat_messages cm WHERE cm.rental_id IN 
          (SELECT r2.id FROM rentals r2 
           WHERE (r2.borrower_id = ? AND r2.lender_id = CASE WHEN r.borrower_id = ? THEN r.lender_id ELSE r.borrower_id END)
              OR (r2.lender_id = ? AND r2.borrower_id = CASE WHEN r.borrower_id = ? THEN r.lender_id ELSE r.borrower_id END))
         AND cm.is_read = 0 AND cm.sender_id != ?) as unreadCount
      FROM rentals r
      JOIN items i ON r.item_id = i.id
      JOIN users b ON r.borrower_id = b.id
      JOIN users l ON r.lender_id = l.id
      WHERE (r.borrower_id = ? OR r.lender_id = ?)
        AND r.workflow_status IN ('payment_made', 'approved', 'lender_confirmed', 'active', 'borrower_returned', 'return_completed', 'completed')
      GROUP BY otherUserId
      ORDER BY lastMessageTime DESC`,
      [userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId]
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
