// Script to add passport numbers to existing users
const { pool } = require('../config/database');

const updatePassportData = async () => {
  try {
    console.log('Adding passport numbers to users...');
    
    const updates = [
      { email: '6631502022@lamduan.mfu.ac.th', passport: 'TH123456789' },
      { email: '6631502021@lamduan.mfu.ac.th', passport: 'TH987654321' },
      { email: 'test@gmail.com', passport: 'TH555666777' },
      { email: 'john@example.com', passport: 'US123456789' },
      { email: 'jane@example.com', passport: 'US987654321' },
      { email: '6631502028@lamduan.mfu.ac.th', passport: 'TH111222333' },
      { email: 'admin@rentmate.com', passport: 'ADMIN001' }
    ];
    
    for (const update of updates) {
      await pool.query(
        'UPDATE users SET passport_no = ? WHERE email = ?',
        [update.passport, update.email]
      );
      console.log(`✓ Updated passport for ${update.email}`);
    }
    
    // Verify updates
    const [users] = await pool.query('SELECT id, name, email, passport_no FROM users');
    console.log('\n=== Current Users ===');
    console.table(users);
    
    console.log('\n✓ All passport numbers updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating passport data:', error);
    process.exit(1);
  }
};

updatePassportData();
