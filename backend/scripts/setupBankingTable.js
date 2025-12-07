const { pool } = require('../config/database');

async function setupBankingTable() {
  try {
    const connection = await pool.getConnection();
    
    console.log('Creating banking table...');
    
    // Drop existing table if needed to update schema
    // await connection.query('DROP TABLE IF EXISTS banking');
    
    // Create banking table for admin-managed payment accounts
    await connection.query(`
      CREATE TABLE IF NOT EXISTS banking (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bank_name VARCHAR(100) NOT NULL,
        bank_number VARCHAR(50) NOT NULL,
        account_holder_name VARCHAR(100) NOT NULL,
        account_type ENUM('savings', 'checking', 'business') DEFAULT 'savings',
        branch_name VARCHAR(100),
        swift_code VARCHAR(20),
        photo_scan TEXT,
        is_active BOOLEAN DEFAULT true,
        purpose VARCHAR(200) DEFAULT 'Payment processing',
        notes TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE KEY unique_bank_number (bank_number)
      )
    `);
    
    console.log('✓ Banking table created successfully');
    
    connection.release();
    console.log('\nDatabase setup completed!');
    console.log('This table stores bank accounts used for payment processing.');
    console.log('Only admins can add/edit/delete bank accounts.');
    process.exit(0);
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

setupBankingTable();
