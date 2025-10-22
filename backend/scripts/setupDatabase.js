const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const setupDatabase = async () => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });
    console.log('Connected to MySQL');
    await connection.query('CREATE DATABASE IF NOT EXISTS rentmate');
    await connection.query('USE rentmate');
    
    // Create users table
    await connection.query(`CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      location VARCHAR(255),
      passport_no VARCHAR(50),
      passport_image VARCHAR(500),
      role ENUM('user', 'admin') DEFAULT 'user',
      user_type ENUM('borrower', 'lender', 'both') DEFAULT 'borrower',
      verification_status ENUM('unverified', 'pending', 'verified', 'rejected') DEFAULT 'unverified',
      verification_date TIMESTAMP NULL,
      rating DECIMAL(2,1) DEFAULT 0.0,
      total_ratings INT DEFAULT 0,
      is_verified BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);

    // Create items table
    await connection.query(`CREATE TABLE IF NOT EXISTS items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      item_id VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      price DECIMAL(10,2) NOT NULL,
      deposit DECIMAL(10,2) DEFAULT 0,
      condition_status ENUM('new', 'like-new', 'good', 'fair') DEFAULT 'good',
      location VARCHAR(255),
      owner_id INT NOT NULL,
      images JSON,
      available BOOLEAN DEFAULT true,
      rating DECIMAL(2,1) DEFAULT 0.0,
      total_ratings INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_owner (owner_id),
      INDEX idx_category (category),
      INDEX idx_available (available)
    )`);

    // Create rentals table
    await connection.query(`CREATE TABLE IF NOT EXISTS rentals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      item_id INT NOT NULL,
      borrower_id INT NOT NULL,
      lender_id INT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      total_price DECIMAL(10,2) NOT NULL,
      status ENUM('pending', 'active', 'completed', 'cancelled') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (borrower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (lender_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_item (item_id),
      INDEX idx_borrower (borrower_id),
      INDEX idx_lender (lender_id),
      INDEX idx_status (status)
    )`);

    // Create reviews table
    await connection.query(`CREATE TABLE IF NOT EXISTS reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      rental_id INT NOT NULL,
      reviewer_id INT NOT NULL,
      reviewee_id INT NOT NULL,
      rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_rental (rental_id),
      INDEX idx_reviewee (reviewee_id)
    )`);

    console.log('✅ All tables created successfully');
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await connection.query(`INSERT INTO users (name, email, password, phone, location, role, is_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      ['Admin User', 'admin@rentmate.com', hashedPassword, '+1234567890', 'Main Office', 'admin', true]);

    // Create sample users
    const user1Password = await bcrypt.hash('password123', 10);
    await connection.query(`INSERT INTO users (name, email, password, phone, location, passport_no, is_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      ['John Doe', 'john@example.com', user1Password, '+1234567891', 'New York', 'US123456', true]);

    const user2Password = await bcrypt.hash('password123', 10);
    await connection.query(`INSERT INTO users (name, email, password, phone, location, passport_no, is_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      ['Jane Smith', 'jane@example.com', user2Password, '+1234567892', 'Los Angeles', 'US789012', true]);

    console.log('✅ Sample users created');

    // Get user IDs
    const [users] = await connection.query('SELECT id FROM users WHERE email IN (?, ?)', ['john@example.com', 'jane@example.com']);
    
    if (users.length >= 2) {
      // Create sample items
      await connection.query(`INSERT INTO items (item_id, name, description, category, price, deposit, condition_status, location, owner_id, images, available)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)`,
        ['ITEM000001', '4-Person Camping Tent', 'Spacious 4-person tent with waterproof design', 'tent', 25.00, 50.00, 'good', 'New York', users[0].id, JSON.stringify([]), true]);

      await connection.query(`INSERT INTO items (item_id, name, description, category, price, deposit, condition_status, location, owner_id, images, available)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)`,
        ['ITEM000002', 'Sleeping Bag - Winter', 'Warm sleeping bag rated for -10°C', 'sleeping-bag', 15.00, 30.00, 'like-new', 'New York', users[0].id, JSON.stringify([]), true]);

      await connection.query(`INSERT INTO items (item_id, name, description, category, price, deposit, condition_status, location, owner_id, images, available)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)`,
        ['ITEM000003', 'Camping Backpack 60L', 'Large capacity backpack with rain cover', 'backpack', 20.00, 40.00, 'good', 'Los Angeles', users[1].id, JSON.stringify([]), true]);

      console.log('✅ Sample items created');
    }
    
    console.log('Setup complete! Login with admin@rentmate.com / admin123');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) await connection.end();
    process.exit(0);
  }
};
setupDatabase();
