const { pool } = require('../config/database');

async function updateRentalWorkflow() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 Updating rental workflow...');
    
    // Check if workflow_status column exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'rentmate' 
      AND TABLE_NAME = 'rentals' 
      AND COLUMN_NAME = 'workflow_status'
    `);
    
    // Add workflow_status column if it doesn't exist
    if (columns.length === 0) {
      console.log('Adding workflow_status column...');
      await connection.query(`
        ALTER TABLE rentals
        ADD COLUMN workflow_status VARCHAR(50) DEFAULT 'pending' COMMENT 'Current workflow status'
      `);
      console.log('✅ workflow_status column added');
    } else {
      console.log('✅ workflow_status column already exists');
    }
    
    // Add new columns to rentals table
    await connection.query(`
      ALTER TABLE rentals
      ADD COLUMN IF NOT EXISTS lender_confirmed_transfer BOOLEAN DEFAULT FALSE COMMENT 'Lender confirmed item was lended',
      ADD COLUMN IF NOT EXISTS lender_confirmed_transfer_at TIMESTAMP NULL COMMENT 'When lender confirmed transfer',
      ADD COLUMN IF NOT EXISTS lender_transfer_photo LONGTEXT NULL COMMENT 'Photo uploaded by lender during handover',
      ADD COLUMN IF NOT EXISTS borrower_confirmed_receipt BOOLEAN DEFAULT FALSE COMMENT 'Borrower confirmed receiving item',
      ADD COLUMN IF NOT EXISTS borrower_confirmed_receipt_at TIMESTAMP NULL COMMENT 'When borrower confirmed receipt',
      ADD COLUMN IF NOT EXISTS borrower_receive_photo LONGTEXT NULL COMMENT 'Photo uploaded by borrower when receiving item',
      ADD COLUMN IF NOT EXISTS borrower_confirmed_return BOOLEAN DEFAULT FALSE COMMENT 'Borrower confirmed returning item',
      ADD COLUMN IF NOT EXISTS borrower_confirmed_return_at TIMESTAMP NULL COMMENT 'When borrower confirmed return',
      ADD COLUMN IF NOT EXISTS borrower_return_photo LONGTEXT NULL COMMENT 'Photo uploaded by borrower when returning item',
      ADD COLUMN IF NOT EXISTS lender_confirmed_return BOOLEAN DEFAULT FALSE COMMENT 'Lender confirmed receiving item back',
      ADD COLUMN IF NOT EXISTS lender_confirmed_return_at TIMESTAMP NULL COMMENT 'When lender confirmed receiving back',
      ADD COLUMN IF NOT EXISTS lender_return_photo LONGTEXT NULL COMMENT 'Photo uploaded by lender when receiving item back',
      ADD COLUMN IF NOT EXISTS admin_reject_refund_slip LONGTEXT NULL COMMENT 'Admin refund slip when rejecting payment',
      ADD COLUMN IF NOT EXISTS admin_processed_payment BOOLEAN DEFAULT FALSE COMMENT 'Admin processed final payment',
      ADD COLUMN IF NOT EXISTS admin_processed_payment_at TIMESTAMP NULL COMMENT 'When admin processed payment'
    `);
    
    console.log('✅ Rental workflow columns added successfully');
    
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    connection.release();
    process.exit(1);
  }
}

updateRentalWorkflow();
