const { pool } = require('../config/database');

// Create payment for rental
exports.createPayment = async (req, res) => {
    try {
        const { rental_id, payment_type, amount, payment_method, payment_slip } = req.body;
        const userId = req.user.id;

        // Verify rental exists
        const [rentals] = await pool.query(
            'SELECT * FROM rentals WHERE id = ?',
            [rental_id]
        );

        if (rentals.length === 0) {
            return res.status(404).json({ success: false, message: 'Rental not found' });
        }

        // For bank transfer, status is pending approval
        const paymentStatus = payment_method === 'bank_transfer' ? 'pending' : 'completed';
        const paymentWorkflowStatus = payment_method === 'bank_transfer' ? 'payment_made' : 'payment_made';

        // Create payment record with slip
        const [result] = await pool.query(
            `INSERT INTO payments (rental_id, user_id, amount, payment_type, payment_method, status, payment_slip, completed_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [rental_id, userId, amount, payment_type, payment_method, paymentStatus, payment_slip || null]
        );

        // Update rental payment status
        await pool.query(
            `UPDATE rentals 
             SET payment_amount = ?, 
                 deposit_amount = ?,
                 payment_status = ?,
                 payment_date = NOW(),
                 workflow_status = ?
             WHERE id = ?`,
            [payment_type === 'rental' ? amount : 0, 
             payment_type === 'deposit' ? amount : 0,
             paymentStatus === 'completed' ? 'paid' : 'pending',
             paymentWorkflowStatus,
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

        // Get rental details first
        const [rentals] = await pool.query(
            'SELECT * FROM rentals WHERE id = ?',
            [rental_id]
        );

        if (rentals.length === 0) {
            return res.status(404).json({ success: false, message: 'Rental not found' });
        }

        const rental = rentals[0];

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

        // Update payment status in payments table
        await pool.query(
            `UPDATE payments 
             SET status = 'completed',
                 completed_at = NOW()
             WHERE rental_id = ?`,
            [rental_id]
        );

        // Add progress
        await pool.query(
            `INSERT INTO rental_progress (rental_id, status_type, description, created_by)
             VALUES (?, 'admin_approved', 'Payment approved by admin', ?)`,
            [rental_id, adminId]
        );

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

// Process final payments (lender fee + deposit refund)
exports.processFinalPayments = async (req, res) => {
    try {
        const { rental_id, lender_payment_slip, refund_slip, lender_fee_amount } = req.body;
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
        const depositAmount = parseFloat(rental.total_price) * 0.2;

        // Check if return was completed
        if (!rental.lender_confirmed_return) {
            return res.status(400).json({ success: false, message: 'Lender must confirm return first' });
        }

        // Insert into final_payments table
        await pool.query(
            `INSERT INTO final_payments (rental_id, lender_fee_amount, lender_payment_slip, refund_amount, refund_slip, processed_by, processed_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [rental_id, lender_fee_amount, lender_payment_slip, depositAmount, refund_slip, adminId]
        );

        // Update rental
        await pool.query(
            `UPDATE rentals 
             SET payment_status = 'refunded',
                 deposit_refunded_at = NOW(),
                 lender_paid_at = NOW(),
                 admin_processed_payment = TRUE,
                 admin_processed_payment_at = NOW(),
                 workflow_status = 'completed',
                 status = 'completed'
             WHERE id = ?`,
            [rental_id]
        );

        // Make item available again
        await pool.query('UPDATE items SET available = true WHERE id = ?', [rental.item_id]);

        // Add progress
        await pool.query(
            `INSERT INTO rental_progress (rental_id, status_type, description, created_by)
             VALUES (?, 'payments_processed', 'Final payments processed by admin', ?)`,
            [rental_id, adminId]
        );

        // Notify lender
        if (lender_fee_amount) {
            await pool.query(
                `INSERT INTO notifications (user_id, rental_id, type, title, message)
                 VALUES (?, ?, 'payment_received', 'Payment Received', 'You have received payment for your rental. Thank you!')`,
                [rental.lender_id, rental_id]
            );
        }

        // Notify borrower
        if (refund_slip) {
            await pool.query(
                `INSERT INTO notifications (user_id, rental_id, type, title, message)
                 VALUES (?, ?, 'deposit_refunded', 'Deposit Refunded', 'Your deposit has been refunded. Thank you for using our service!')`,
                [rental.borrower_id, rental_id]
            );
        }

        // Notify both to review
        await pool.query(
            `INSERT INTO notifications (user_id, rental_id, type, title, message)
             VALUES (?, ?, 'review_pending', 'Review Your Experience', 'Please share your experience and rate the other party.')`,
            [rental.borrower_id, rental_id]
        );

        await pool.query(
            `INSERT INTO notifications (user_id, rental_id, type, title, message)
             VALUES (?, ?, 'review_pending', 'Review Your Experience', 'Please share your experience and rate the other party.')`,
            [rental.lender_id, rental_id]
        );

        res.json({ success: true, message: 'Final payments processed successfully' });

    } catch (error) {
        console.error('Process final payments error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Legacy function - kept for compatibility
exports.refundDeposit = async (req, res) => {
    // Redirect to new function
    return exports.processFinalPayments(req, res);
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
