const mysql = require('mysql2/promise');

// Database configuration
const config = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'rentmate'
};

async function addStatusColumn() {
    let connection;
    
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(config);
        
        // Check if status column exists
        console.log('Checking if status column exists...');
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'rentmate' 
            AND TABLE_NAME = 'rentals' 
            AND COLUMN_NAME = 'status'
        `);
        
        if (columns.length === 0) {
            console.log('Adding status column to rentals table...');
            await connection.execute(`
                ALTER TABLE rentals 
                ADD COLUMN status VARCHAR(50) DEFAULT 'pending' AFTER id
            `);
            
            console.log('✅ Status column added successfully');
            
            // Update existing records to have appropriate status values based on workflow_status
            console.log('Updating existing records...');
            await connection.execute(`
                UPDATE rentals 
                SET status = CASE 
                    WHEN workflow_status = 'rejected' THEN 'rejected'
                    WHEN workflow_status = 'return_completed' THEN 'completed'
                    WHEN workflow_status IN ('payment_made', 'approved', 'lender_confirmed', 'active', 'borrower_returned') THEN 'approved'
                    ELSE 'pending'
                END
            `);
            
            console.log('✅ Existing records updated');
        } else {
            console.log('✅ Status column already exists');
        }
        
    } catch (error) {
        console.error('❌ Error adding status column:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the migration
addStatusColumn();