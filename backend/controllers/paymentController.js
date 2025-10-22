const { pool } = require('../config/database');

// Create payment for rental
exports.createPayment = async (req, res) => {
    try {
        const { rental_id, payment_type, amount, payment_method } = req.body;
        const userId = req.user.id;

        // Verify rental exists
        const [rentals] = await pool.query(
            'SELECT * FROM rentals WHERE id = ?',
            [rental_id]
        );

        if (rentals.length === 0) {
            return res.status(404).json({ success: false, message: 'Rental not found' });
        }

        // Create payment record
        const [result] = await pool.query(
            `INSERT INTO payments (rental_id, user_id, amount, payment_type, payment_method, status, completed_at) 
             VALUES (?, ?, ?, ?, ?, 'completed', NOW())`,
            [rental_id, userId, amount, payment_type, payment_method]
        );

        // Update rental payment status
        await pool.query(
            `UPDATE rentals 
             SET payment_amount = ?, 
                 deposit_amount = ?,
                 payment_status = 'paid',
                 payment_date = NOW(),
                 workflow_status = 'payment_made'
             WHERE id = ?`,
            [payment_type === 'rental' ? amount : 0, 
             payment_type === 'deposit' ? amount : 0,
             rental_id]
        );

        // Add progress tracking
        await pool.query(
            `INSERT INTO rental_progress (rental_id, status_type, description, created_by)
             VALUES (?, 'payment_completed', 'Payment completed by borrower', ?)`,
            [rental_id, userId]
        );

        // Notify admin
        const [admins] = await pool.query(
            'SELECT id FROM users WHERE role = "admin"'
        );
        
        for (const admin of admins) {
            await pool.query(
                `INSERT INTO notifications (user_id, rental_id, type, title, message)
                 VALUES (?, ?, 'payment_received', 'New Payment Received', 'A rental payment requires your approval')`,
                [admin.id, rental_id]
            );
        }

        res.json({
            success: true,
            message: 'Payment completed successfully',
            data: { payment_id: result.insertId }
        });

    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Admin approve payment
exports.approvePayment = async (req, res) => {
    try {
        const { rental_id } = req.body;
        const adminId = req.user.id;

        // Verify admin role
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // Update rental status
        await pool.query(
            `UPDATE rentals 
             SET payment_status = 'approved',
                 admin_approved_at = NOW(),
                 admin_approved_by = ?,
                 workflow_status = 'approved'
             WHERE id = ?`,
            [adminId, rental_id]
        );

        // Add progress
        await pool.query(
            `INSERT INTO rental_progress (rental_id, status_type, description, created_by)
             VALUES (?, 'admin_approved', 'Payment approved by admin', ?)`,
            [rental_id, adminId]
        );

        // Get rental details
        const [rentals] = await pool.query(
            'SELECT * FROM rentals WHERE id = ?',
            [rental_id]
        );
        const rental = rentals[0];

        // Notify lender and borrower
        await pool.query(
            `INSERT INTO notifications (user_id, rental_id, type, title, message)
             VALUES (?, ?, 'rental_approved', 'Rental Approved', 'Your rental has been approved! You can now chat with the other party.')`,
            [rental.lender_id, rental_id]
        );

        await pool.query(
            `INSERT INTO notifications (user_id, rental_id, type, title, message)
             VALUES (?, ?, 'rental_approved', 'Rental Approved', 'Your rental request has been approved! You can now chat with the lender.')`,
            [rental.borrower_id, rental_id]
        );

        res.json({ success: true, message: 'Payment approved successfully' });

    } catch (error) {
        console.error('Approve payment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Transfer payment to lender
exports.transferToLender = async (req, res) => {
    try {
        const { rental_id } = req.body;
        const adminId = req.user.id;

        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const [rentals] = await pool.query(
            'SELECT * FROM rentals WHERE id = ?',
            [rental_id]
        );

        if (rentals.length === 0) {
            return res.status(404).json({ success: false, message: 'Rental not found' });
        }

        const rental = rentals[0];

        // Update rental
        await pool.query(
            `UPDATE rentals 
             SET payment_status = 'transferred',
                 lender_paid_at = NOW(),
                 workflow_status = 'active'
             WHERE id = ?`,
            [rental_id]
        );

        // Add progress
        await pool.query(
            `INSERT INTO rental_progress (rental_id, status_type, description, created_by)
             VALUES (?, 'payment_transferred', 'Payment transferred to lender', ?)`,
            [rental_id, adminId]
        );

        // Notify lender
        await pool.query(
            `INSERT INTO notifications (user_id, rental_id, type, title, message)
             VALUES (?, ?, 'payment_received', 'Payment Received', 'You have received payment for your rental item.')`,
            [rental.lender_id, rental_id]
        );

        res.json({ success: true, message: 'Payment transferred to lender' });

    } catch (error) {
        console.error('Transfer payment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Refund deposit to borrower
exports.refundDeposit = async (req, res) => {
    try {
        const { rental_id } = req.body;
        const adminId = req.user.id;

        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const [rentals] = await pool.query(
            'SELECT * FROM rentals WHERE id = ?',
            [rental_id]
        );

        if (rentals.length === 0) {
            return res.status(404).json({ success: false, message: 'Rental not found' });
        }

        const rental = rentals[0];

        // Create refund payment record
        await pool.query(
            `INSERT INTO payments (rental_id, user_id, amount, payment_type, status, completed_at)
             VALUES (?, ?, ?, 'refund', 'completed', NOW())`,
            [rental_id, rental.borrower_id, rental.deposit_amount]
        );

        // Update rental
        await pool.query(
            `UPDATE rentals 
             SET payment_status = 'refunded',
                 deposit_refunded_at = NOW(),
                 workflow_status = 'completed'
             WHERE id = ?`,
            [rental_id]
        );

        // Add progress
        await pool.query(
            `INSERT INTO rental_progress (rental_id, status_type, description, created_by)
             VALUES (?, 'deposit_refunded', 'Deposit refunded to borrower', ?)`,
            [rental_id, adminId]
        );

        // Notify borrower
        await pool.query(
            `INSERT INTO notifications (user_id, rental_id, type, title, message)
             VALUES (?, ?, 'deposit_refunded', 'Deposit Refunded', 'Your deposit has been refunded.')`,
            [rental.borrower_id, rental_id]
        );

        res.json({ success: true, message: 'Deposit refunded successfully' });

    } catch (error) {
        console.error('Refund deposit error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get payment history
exports.getPaymentHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [payments] = await pool.query(
            `SELECT p.*, r.start_date, r.end_date, i.name as item_name,
                    u.name as user_name
             FROM payments p
             JOIN rentals r ON p.rental_id = r.id
             JOIN items i ON r.item_id = i.id
             JOIN users u ON p.user_id = u.id
             WHERE p.user_id = ? OR r.lender_id = ?
             ORDER BY p.created_at DESC`,
            [userId, userId]
        );

        res.json({ success: true, data: payments });

    } catch (error) {
        console.error('Get payment history error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
