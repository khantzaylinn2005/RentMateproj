const { pool } = require('../config/database');

async function fixWorkflowStatus() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 Fixing workflow_status for existing rentals...');
    
    // Update existing rentals to set workflow_status based on current status
    await connection.query(`
      UPDATE rentals 
      SET workflow_status = CASE 
        WHEN status = 'pending' AND payment_status IS NULL THEN 'pending'
        WHEN status = 'pending' AND payment_status = 'pending' THEN 'payment_made'
        WHEN payment_status = 'approved' AND lender_confirmed_transfer = FALSE THEN 'approved'
        WHEN lender_confirmed_transfer = TRUE AND borrower_confirmed_receipt = FALSE THEN 'lender_confirmed'
        WHEN borrower_confirmed_receipt = TRUE AND borrower_confirmed_return = FALSE THEN 'active'
        WHEN borrower_confirmed_return = TRUE AND lender_confirmed_return = FALSE THEN 'borrower_returned'
        WHEN lender_confirmed_return = TRUE AND admin_processed_payment = FALSE THEN 'return_completed'
        WHEN status = 'completed' THEN 'completed'
        WHEN status = 'cancelled' THEN 'cancelled'
        ELSE workflow_status
      END
      WHERE workflow_status IS NULL OR workflow_status = ''
    `);
    
    console.log('✅ Workflow status fixed for all existing rentals');
    
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    connection.release();
    process.exit(1);
  }
}

fixWorkflowStatus();
