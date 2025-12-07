const { pool } = require('../config/database');

async function addRejectionFields() {
    try {
        console.log('Adding rejection fields to rentals table...');

        // Add rejection_reason column
        await pool.query(`
            ALTER TABLE rentals 
            ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL
        `);
        console.log('✓ Added rejection_reason column');

        // Add rejected_by column
        await pool.query(`
            ALTER TABLE rentals 
            ADD COLUMN IF NOT EXISTS rejected_by INT NULL,
            ADD CONSTRAINT fk_rejected_by FOREIGN KEY (rejected_by) REFERENCES users(id) ON DELETE SET NULL
        `);
        console.log('✓ Added rejected_by column');

        // Add rejected_at column
        await pool.query(`
            ALTER TABLE rentals 
            ADD COLUMN IF NOT EXISTS rejected_at DATETIME NULL
        `);
        console.log('✓ Added rejected_at column');

        console.log('\n✅ All rejection fields added successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding rejection fields:', error);
        process.exit(1);
    }
}

addRejectionFields();
