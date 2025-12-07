const mysql = require('mysql2/promise');

async function addPaymentSlips() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'rentmate'
    });

    try {
        console.log('Adding payment slip columns...');

        // Add payment_slip to payments table (for borrower payments)
        await connection.query(`
            ALTER TABLE payments 
            ADD COLUMN IF NOT EXISTS payment_slip LONGTEXT NULL
        `);

        // Add transfer_slip to rentals table (for admin to lender transfers)
        await connection.query(`
            ALTER TABLE rentals 
            ADD COLUMN IF NOT EXISTS transfer_slip LONGTEXT NULL,
            ADD COLUMN IF NOT EXISTS transfer_amount DECIMAL(10,2) NULL,
            ADD COLUMN IF NOT EXISTS transfer_notes TEXT NULL
        `);

        console.log('✅ Payment slip columns added successfully!');
        console.log('Columns added:');
        console.log('  - payments.payment_slip (LONGTEXT) - Stores borrower payment slip images');
        console.log('  - rentals.transfer_slip (LONGTEXT) - Stores admin transfer slip images');
        console.log('  - rentals.transfer_amount (DECIMAL) - Stores transfer amount');
        console.log('  - rentals.transfer_notes (TEXT) - Stores transfer notes');

    } catch (error) {
        console.error('Error adding payment slip columns:', error);
    } finally {
        await connection.end();
    }
}

addPaymentSlips();
