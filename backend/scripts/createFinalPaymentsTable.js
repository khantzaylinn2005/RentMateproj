const mysql = require('mysql2/promise');

// Database configuration
const config = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'rentmate'
};

async function createFinalPaymentsTable() {
    let connection;
    
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(config);
        
        // Create final_payments table
        console.log('Creating final_payments table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS final_payments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                rental_id INT NOT NULL,
                lender_fee_amount DECIMAL(10,2) NULL,
                lender_payment_slip LONGTEXT NULL,
                refund_amount DECIMAL(10,2) NULL,
                refund_slip LONGTEXT NULL,
                processed_by INT NOT NULL,
                processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE CASCADE,
                FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE RESTRICT,
                INDEX idx_rental_id (rental_id)
            )
        `);
        
        console.log('✅ final_payments table created successfully');
        
        console.log('\nTable structure:');
        console.log('  - id: Primary key');
        console.log('  - rental_id: Foreign key to rentals table');
        console.log('  - lender_fee_amount: Amount paid to lender');
        console.log('  - lender_payment_slip: Admin\'s payment slip showing transfer to lender');
        console.log('  - refund_amount: Deposit amount refunded to borrower');
        console.log('  - refund_slip: Admin\'s payment slip showing refund to borrower');
        console.log('  - processed_by: Admin user who processed the payments');
        console.log('  - processed_at: When payments were processed');
        
    } catch (error) {
        console.error('❌ Error creating final_payments table:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the migration
createFinalPaymentsTable();