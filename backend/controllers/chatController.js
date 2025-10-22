const { pool } = require('../config/database');

// Send message
exports.sendMessage = async (req, res) => {
    try {
        const { rental_id, message } = req.body;
        const senderId = req.user.id;

        // Verify rental exists and user is part of it
        const [rentals] = await pool.query(
            'SELECT * FROM rentals WHERE id = ? AND (borrower_id = ? OR lender_id = ?)',
            [rental_id, senderId, senderId]
        );

        if (rentals.length === 0) {
            return res.status(404).json({ success: false, message: 'Rental not found or unauthorized' });
        }

        const rental = rentals[0];

        // Determine receiver (if sender is borrower, receiver is lender and vice versa)
        const receiverId = rental.borrower_id === senderId ? rental.lender_id : rental.borrower_id;

        // Insert message
        const [result] = await pool.query(
            `INSERT INTO chat_messages (rental_id, sender_id, receiver_id, message_type, message_text)
             VALUES (?, ?, ?, 'text', ?)`,
            [rental_id, senderId, receiverId, message]
        );

        // Notify receiver
        await pool.query(
            `INSERT INTO notifications (user_id, rental_id, type, title, message)
             VALUES (?, ?, 'new_message', 'New Message', 'You have a new message in your rental chat')`,
            [receiverId, rental_id]
        );

        res.json({
            success: true,
            message: 'Message sent successfully',
            data: { message_id: result.insertId }
        });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get chat messages
exports.getMessages = async (req, res) => {
    try {
        const { rental_id } = req.params;
        const userId = req.user.id;

        // Verify user is part of rental
        const [rentals] = await pool.query(
            'SELECT * FROM rentals WHERE id = ? AND (borrower_id = ? OR lender_id = ?)',
            [rental_id, userId, userId]
        );

        if (rentals.length === 0) {
            return res.status(404).json({ success: false, message: 'Rental not found or unauthorized' });
        }

        // Get messages
        const [messages] = await pool.query(
            `SELECT m.*, 
                    sender.name as sender_name,
                    sender.email as sender_email
             FROM chat_messages m
             JOIN users sender ON m.sender_id = sender.id
             WHERE m.rental_id = ?
             ORDER BY m.created_at ASC`,
            [rental_id]
        );

        // Mark messages as read
        await pool.query(
            `UPDATE chat_messages 
             SET is_read = 1 
             WHERE rental_id = ? AND receiver_id = ? AND is_read = 0`,
            [rental_id, userId]
        );

        res.json({ success: true, data: messages });

    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get unread message count
exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;

        const [result] = await pool.query(
            `SELECT COUNT(*) as count 
             FROM chat_messages 
             WHERE receiver_id = ? AND is_read = 0`,
            [userId]
        );

        res.json({ success: true, data: { count: result[0].count } });

    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
