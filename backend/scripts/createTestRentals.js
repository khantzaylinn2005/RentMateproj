const mysql = require('mysql2/promise');

const createTestRentals = async () => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'rentmate'
    });

    console.log('Connected to MySQL');

    // Get user "Testing" (ID 10)
    const [testingUser] = await connection.query('SELECT id FROM users WHERE email = ?', ['test@gmail.com']);
    
    if (testingUser.length === 0) {
      console.log('❌ User "Testing" not found. Please make sure you\'re logged in as Testing.');
      return;
    }

    const testingUserId = testingUser[0].id;
    console.log(`Found user Testing with ID: ${testingUserId}`);

    // Get some items owned by OTHER users (not Testing)
    const [items] = await connection.query('SELECT id, name, owner_id FROM items WHERE owner_id != ?', [testingUserId]);
    
    if (items.length === 0) {
      console.log('❌ No items found owned by other users');
      return;
    }

    console.log(`Found ${items.length} items owned by other users`);

    // Create a rental where Testing is BORROWING from someone else
    const borrowItem = items[0];
    await connection.query(`INSERT INTO rentals (item_id, borrower_id, lender_id, start_date, end_date, total_price, status)
      VALUES (?, ?, ?, DATE_ADD(CURDATE(), INTERVAL 1 DAY), DATE_ADD(CURDATE(), INTERVAL 5 DAY), ?, 'pending')`,
      [borrowItem.id, testingUserId, borrowItem.owner_id, 75.00]);

    console.log(`✅ Created rental: Testing is BORROWING "${borrowItem.name}" from user ${borrowItem.owner_id}`);

    // Now we need to create an item owned by Testing, then have someone request it
    // First, create an item for Testing
    const itemId = `ITEM${String(Date.now()).slice(-6)}`;
    await connection.query(`INSERT INTO items (item_id, name, description, category, price, deposit, condition_status, location, owner_id, images, available)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [itemId, 'Testing\'s Mountain Bike', 'A great mountain bike for trails', 'bike', 30.00, 100.00, 'good', 'Bangkok', testingUserId, JSON.stringify([]), true]);

    const [newItem] = await connection.query('SELECT id FROM items WHERE item_id = ?', [itemId]);
    const newItemId = newItem[0].id;

    console.log(`✅ Created item "${itemId}" owned by Testing (ID: ${newItemId})`);

    // Now create a rental where someone is BORROWING from Testing
    const [otherUsers] = await connection.query('SELECT id FROM users WHERE id != ? LIMIT 1', [testingUserId]);
    
    if (otherUsers.length > 0) {
      const borrowerId = otherUsers[0].id;
      
      await connection.query(`INSERT INTO rentals (item_id, borrower_id, lender_id, start_date, end_date, total_price, status)
        VALUES (?, ?, ?, DATE_ADD(CURDATE(), INTERVAL 2 DAY), DATE_ADD(CURDATE(), INTERVAL 6 DAY), ?, 'pending')`,
        [newItemId, borrowerId, testingUserId, 90.00]);

      console.log(`✅ Created rental: User ${borrowerId} is BORROWING "Testing's Mountain Bike" from Testing`);
      console.log('\n📋 Summary:');
      console.log('- Borrowing page should show 1 rental (Testing borrowing from others)');
      console.log('- Lending page should show 1 rental request (someone wants to borrow from Testing)');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) await connection.end();
    process.exit(0);
  }
};

createTestRentals();
