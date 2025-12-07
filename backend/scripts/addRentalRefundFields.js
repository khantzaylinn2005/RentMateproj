const mysql = require('mysql2/promise');

async function addRentalRefundFields() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'rentmate'
    });

    try {
        console.log('Adding refund bank columns to rentals table...');

        await connection.query(`
            ALTER TABLE rentals
            ADD COLUMN IF NOT EXISTS refund_bank_acc_name VARCHAR(255) NULL,
            ADD COLUMN IF NOT EXISTS refund_bank_number VARCHAR(100) NULL,
            ADD COLUMN IF NOT EXISTS refund_bank_name VARCHAR(255) NULL,
            ADD COLUMN IF NOT EXISTS refund_bank_photo LONGTEXT NULL
        `);

        console.log('✅ Refund bank columns added to rentals table.');
        console.log('Columns added:');
        console.log('  - refund_bank_acc_name (borrower refund account holder)');
        console.log('  - refund_bank_number (borrower refund account number)');
        console.log('  - refund_bank_name (borrower refund bank name)');
        console.log('  - refund_bank_photo (supporting document/photo)');
    } catch (error) {
        console.error('Error adding refund bank columns:', error);
    } finally {
        await connection.end();
    }
}

addRentalRefundFields();
