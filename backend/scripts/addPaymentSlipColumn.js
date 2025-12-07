const { pool } = require('../config/database');

async function addPaymentSlipColumn() {
    try {
        console.log('Adding payment_slip column to payments table...');
        
        // Check if column already exists
        const [columns] = await pool.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'payments' 
            AND COLUMN_NAME = 'payment_slip'
        `);

        if (columns.length > 0) {
            console.log('payment_slip column already exists');
            process.exit(0);
        }

        // Add payment_slip column
        await pool.query(`
            ALTER TABLE payments 
            ADD COLUMN payment_slip LONGTEXT NULL AFTER payment_method
        `);

        console.log('✓ payment_slip column added successfully');
        process.exit(0);

    } catch (error) {
        console.error('Error adding payment_slip column:', error);
        process.exit(1);
    }
}

addPaymentSlipColumn();
