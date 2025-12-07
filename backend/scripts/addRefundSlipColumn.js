const mysql = require('mysql2/promise');
require('dotenv').config();

async function addRefundSlipColumn() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'rentmate'
        });

        console.log('Connected to database...');

        // Check if refund_slip column already exists
        const [columns] = await connection.query(
            `SHOW COLUMNS FROM payments LIKE 'refund_slip'`
        );

        if (columns.length > 0) {
            console.log('✓ refund_slip column already exists in payments table');
            return;
        }

        // Add refund_slip column
        console.log('Adding refund_slip column to payments table...');
        await connection.query(
            `ALTER TABLE payments 
             ADD COLUMN refund_slip LONGTEXT NULL AFTER completed_at`
        );

        console.log('✓ Successfully added refund_slip column to payments table');

        // Verify the column was added
        const [verify] = await connection.query(
            `SHOW COLUMNS FROM payments LIKE 'refund_slip'`
        );

        if (verify.length > 0) {
            console.log('✓ Verification successful - refund_slip column is present');
            console.log('Column details:', verify[0]);
        }

    } catch (error) {
        console.error('❌ Error adding refund_slip column:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed');
        }
    }
}

// Run the migration
addRefundSlipColumn()
    .then(() => {
        console.log('\n✓ Migration completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    });
