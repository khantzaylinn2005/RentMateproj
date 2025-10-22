const mysql = require('mysql2/promise');
require('dotenv').config();

const addItemApproval = async () => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rentmate'
    });

    console.log('Connected to MySQL');

    // Add approval_status column to items table
    await connection.query(`
      ALTER TABLE items 
      ADD COLUMN IF NOT EXISTS approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' AFTER available
    `);
    console.log('✅ Added approval_status column to items table');

    // Add approval_date column
    await connection.query(`
      ALTER TABLE items 
      ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP NULL AFTER approval_status
    `);
    console.log('✅ Added approval_date column to items table');

    // Set existing items to 'approved' (backward compatibility)
    await connection.query(`
      UPDATE items 
      SET approval_status = 'approved', approval_date = NOW() 
      WHERE approval_status = 'pending'
    `);
    console.log('✅ Set existing items to approved status');

    console.log('\n✅ Migration completed successfully!');
    console.log('Items table now has approval_status and approval_date columns');

  } catch (error) {
    console.error('❌ Migration Error:', error.message);
  } finally {
    if (connection) await connection.end();
    process.exit(0);
  }
};

addItemApproval();
