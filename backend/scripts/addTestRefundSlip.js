const mysql = require('mysql2/promise');
require('dotenv').config();

// A proper test image - small sample receipt/slip in base64 format (200x200 red square with text)
const testImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iI2ZmZmZmZiIvPgogIDxyZWN0IHg9IjIwIiB5PSIyMCIgd2lkdGg9IjM2MCIgaGVpZ2h0PSI1NjAiIGZpbGw9IiNmOWZhZmIiIHN0cm9rZT0iI2UwZTBlMCIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgPHRleHQgeD0iMjAwIiB5PSI4MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzEwYjk4MSI+UkVGVU5EIFJFQ0VJUFQ8L3RleHQ+CiAgPGxpbmUgeDE9IjQwIiB5MT0iMTAwIiB4Mj0iMzYwIiB5Mj0iMTAwIiBzdHJva2U9IiNlMGUwZTAiIHN0cm9rZS13aWR0aD0iMiIvPgogIDx0ZXh0IHg9IjQwIiB5PSIxNDAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzM3NDE1MSI+VHJhbnNhY3Rpb24gSUQ6IDEyMzQ1Njc4OTA8L3RleHQ+CiAgPHRleHQgeD0iNDAiIHk9IjE3MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiBmaWxsPSIjMzc0MTUxIj5EYXRlOiAyMi8xMC8yMDI1PC90ZXh0PgogIDx0ZXh0IHg9IjQwIiB5PSIyMDAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzM3NDE1MSI+VGltZTogMDM6MDA6NDU8L3RleHQ+CiAgPGxpbmUgeDE9IjQwIiB5MT0iMjIwIiB4Mj0iMzYwIiB5Mj0iMjIwIiBzdHJva2U9IiNlMGUwZTAiIHN0cm9rZS13aWR0aD0iMiIvPgogIDx0ZXh0IHg9IjQwIiB5PSIyNjAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IiMzNzQxNTEiPkRlcG9zaXQgUmVmdW5kPC90ZXh0PgogIDx0ZXh0IHg9IjQwIiB5PSIyOTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzY0NzQ4YiI+UmVudGFsIElEOiAxNDwvdGV4dD4KICA8dGV4dCB4PSI0MCIgeT0iMzIwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM2NDc0OGIiPkJvcnJvd2VyOiBTbmFrZSBQPC90ZXh0PgogIDxsaW5lIHgxPSI0MCIgeTE9IjM0MCIgeDI9IjM2MCIgeTI9IjM0MCIgc3Ryb2tlPSIjZTBlMGUwIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8dGV4dCB4PSI0MCIgeT0iMzgwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiMzNzQxNTEiPkFtb3VudDo8L3RleHQ+CiAgPHRleHQgeD0iMzYwIiB5PSIzODAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyMCIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJlbmQiIGZpbGw9IiMxMGI5ODEiPuC4vzAuMDA8L3RleHQ+CiAgPGxpbmUgeDE9IjQwIiB5MT0iNDAwIiB4Mj0iMzYwIiB5Mj0iNDAwIiBzdHJva2U9IiNlMGUwZTAiIHN0cm9rZS13aWR0aD0iMiIvPgogIDx0ZXh0IHg9IjQwIiB5PSI0NDAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzY0NzQ4YiI+UGF5bWVudCBNZXRob2Q6IEJhbmsgVHJhbnNmZXI8L3RleHQ+CiAgPHRleHQgeD0iNDAiIHk9IjQ3MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiBmaWxsPSIjNjQ3NDhiIj5TdGF0dXM6IENvbXBsZXRlZDwvdGV4dD4KICA8cmVjdCB4PSI0MCIgeT0iNTAwIiB3aWR0aD0iMzIwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjZWZmNmZmIiBzdHJva2U9IiMxMGI5ODEiIHN0cm9rZS13aWR0aD0iMiIgcng9IjUiLz4KICA8dGV4dCB4PSIyMDAiIHk9IjUzNSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzEwYjk4MSI+VEhBTksgWU9VITwvdGV4dD4KPC9zdmc+';

async function addTestRefundSlip() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'rentmate'
        });

        console.log('Connected to database...\n');

        // Get the most recent refund payment
        const [payments] = await connection.query(
            `SELECT id, rental_id, user_id, amount 
             FROM payments 
             WHERE payment_type = 'refund' 
             ORDER BY completed_at DESC 
             LIMIT 1`
        );

        if (payments.length === 0) {
            console.log('No refund payments found in database');
            return;
        }

        const payment = payments[0];
        console.log(`Found refund payment:`);
        console.log(`  Payment ID: ${payment.id}`);
        console.log(`  Rental ID: ${payment.rental_id}`);
        console.log(`  User ID: ${payment.user_id}`);
        console.log(`  Amount: ${payment.amount}`);

        // Update the payment with a test refund slip
        console.log('\nAdding test refund slip...');
        await connection.query(
            `UPDATE payments 
             SET refund_slip = ?
             WHERE id = ?`,
            [testImage, payment.id]
        );

        console.log('✓ Test refund slip added successfully!');
        console.log('\nNow you can:');
        console.log(`1. Go to notifications page`);
        console.log(`2. Find the "Deposit Refunded" notification for Rental ID ${payment.rental_id}`);
        console.log(`3. Click "View Refund Slip"`);
        console.log(`4. You should now see the refund slip image instead of "No Refund Slip"`);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

addTestRefundSlip();
