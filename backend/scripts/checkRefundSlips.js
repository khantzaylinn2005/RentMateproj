const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkRefundSlips() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'rentmate'
        });

        console.log('Connected to database...\n');

        // Check all payments with refund type
        const [refundPayments] = await connection.query(
            `SELECT id, rental_id, user_id, amount, payment_type, 
                    LENGTH(refund_slip) as refund_slip_length,
                    completed_at
             FROM payments 
             WHERE payment_type = 'refund'
             ORDER BY completed_at DESC
             LIMIT 10`
        );

        console.log('=== Recent Refund Payments ===');
        if (refundPayments.length === 0) {
            console.log('No refund payments found in database');
        } else {
            refundPayments.forEach(p => {
                console.log(`Payment ID: ${p.id}`);
                console.log(`  Rental ID: ${p.rental_id}`);
                console.log(`  User ID: ${p.user_id}`);
                console.log(`  Amount: ${p.amount}`);
                console.log(`  Has Refund Slip: ${p.refund_slip_length > 0 ? 'YES' : 'NO'}`);
                console.log(`  Refund Slip Length: ${p.refund_slip_length || 0} bytes`);
                console.log(`  Completed: ${p.completed_at}`);
                console.log('---');
            });
        }

        // Check rentals with refund status
        console.log('\n=== Rentals with Refund Status ===');
        const [rentals] = await connection.query(
            `SELECT r.id, r.payment_status, r.deposit_refunded_at,
                    COUNT(p.id) as payment_count,
                    SUM(CASE WHEN p.payment_type = 'refund' THEN 1 ELSE 0 END) as refund_count,
                    MAX(CASE WHEN p.payment_type = 'refund' THEN LENGTH(p.refund_slip) ELSE 0 END) as refund_slip_length
             FROM rentals r
             LEFT JOIN payments p ON r.id = p.rental_id
             WHERE r.payment_status = 'refunded'
             GROUP BY r.id
             ORDER BY r.deposit_refunded_at DESC
             LIMIT 5`
        );

        if (rentals.length === 0) {
            console.log('No rentals with refunded status found');
        } else {
            rentals.forEach(r => {
                console.log(`Rental ID: ${r.id}`);
                console.log(`  Status: ${r.payment_status}`);
                console.log(`  Refunded At: ${r.deposit_refunded_at}`);
                console.log(`  Total Payments: ${r.payment_count}`);
                console.log(`  Refund Payments: ${r.refund_count}`);
                console.log(`  Has Refund Slip: ${r.refund_slip_length > 0 ? 'YES' : 'NO'}`);
                console.log(`  Slip Length: ${r.refund_slip_length} bytes`);
                console.log('---');
            });
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkRefundSlips();
