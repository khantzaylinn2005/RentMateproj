const { pool } = require('../config/database');

async function migrateDatabase() {
  const connection = await pool.getConnection();
  
  try {
    console.log('Starting database migration...');
    
    // Check if columns already exist
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME IN ('user_type', 'verification_status', 'passport_image', 'verification_date')
    `);
    
    const existingColumns = columns.map(col => col.COLUMN_NAME);
    
    // Add passport_image column if not exists
    if (!existingColumns.includes('passport_image')) {
      console.log('Adding passport_image column...');
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN passport_image VARCHAR(500) AFTER passport_no
      `);
      console.log('✓ passport_image column added');
    } else {
      console.log('✓ passport_image column already exists');
    }
    
    // Add user_type column if not exists
    if (!existingColumns.includes('user_type')) {
      console.log('Adding user_type column...');
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN user_type ENUM('borrower', 'lender', 'both') DEFAULT 'borrower' AFTER role
      `);
      console.log('✓ user_type column added');
    } else {
      console.log('✓ user_type column already exists');
    }
    
    // Add verification_status column if not exists
    if (!existingColumns.includes('verification_status')) {
      console.log('Adding verification_status column...');
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN verification_status ENUM('unverified', 'pending', 'verified', 'rejected') DEFAULT 'unverified' AFTER user_type
      `);
      console.log('✓ verification_status column added');
    } else {
      console.log('✓ verification_status column already exists');
    }
    
    // Add verification_date column if not exists
    if (!existingColumns.includes('verification_date')) {
      console.log('Adding verification_date column...');
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN verification_date TIMESTAMP NULL AFTER verification_status
      `);
      console.log('✓ verification_date column added');
    } else {
      console.log('✓ verification_date column already exists');
    }
    
    // Update existing users with passport_no to have verification_status = 'verified' if is_verified = 1
    console.log('Updating existing users...');
    await connection.query(`
      UPDATE users 
      SET verification_status = 'verified', 
          user_type = 'lender',
          verification_date = NOW()
      WHERE is_verified = 1 AND passport_no IS NOT NULL
    `);
    
    console.log('✓ Database migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

// Run migration
migrateDatabase()
  .then(() => {
    console.log('Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
