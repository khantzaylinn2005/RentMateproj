const mysql = require('mysql2/promise');

async function setupRentalWorkflow() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'rentmate'
    });

    try {
        console.log('Setting up rental workflow tables...');

        // Update rentals table to include payment and workflow fields
        await connection.query(`
            ALTER TABLE rentals 
            ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS payment_status ENUM('pending', 'paid', 'approved', 'transferred', 'refunded') DEFAULT 'pending',
            ADD COLUMN IF NOT EXISTS payment_date DATETIME NULL,
            ADD COLUMN IF NOT EXISTS admin_approved_at DATETIME NULL,
            ADD COLUMN IF NOT EXISTS admin_approved_by INT NULL,
            ADD COLUMN IF NOT EXISTS lender_paid_at DATETIME NULL,
            ADD COLUMN IF NOT EXISTS item_returned_at DATETIME NULL,
            ADD COLUMN IF NOT EXISTS return_confirmed_by_lender TINYINT(1) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS deposit_refunded_at DATETIME NULL,
            ADD COLUMN IF NOT EXISTS workflow_status ENUM('payment_pending', 'payment_made', 'admin_review', 'approved', 'active', 'return_pending', 'completed', 'cancelled') DEFAULT 'payment_pending',
            ADD COLUMN IF NOT EXISTS lender_transfer_photo LONGTEXT NULL,
            ADD COLUMN IF NOT EXISTS borrower_receive_photo LONGTEXT NULL,
            ADD COLUMN IF NOT EXISTS admin_reject_refund_slip LONGTEXT NULL
        `);

        // Create payments table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                rental_id INT NOT NULL,
                user_id INT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                payment_type ENUM('rental', 'deposit', 'refund') NOT NULL,
                payment_method VARCHAR(50) DEFAULT 'card',
                transaction_id VARCHAR(255) NULL,
                status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME NULL,
                FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Create chat messages table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                rental_id INT NOT NULL,
                sender_id INT NOT NULL,
                receiver_id INT NOT NULL,
                message_type ENUM('text', 'image') DEFAULT 'text',
                message_text TEXT NULL,
                image_url VARCHAR(500) NULL,
                is_read TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE CASCADE,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Create rental progress tracking table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS rental_progress (
                id INT AUTO_INCREMENT PRIMARY KEY,
                rental_id INT NOT NULL,
                status_type VARCHAR(100) NOT NULL,
                description TEXT NOT NULL,
                created_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);

        // Create notifications table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                rental_id INT NULL,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                is_read TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE CASCADE
            )
        `);

        console.log('✅ Rental workflow tables created successfully!');
        console.log('Tables created:');
        console.log('  - Updated rentals table with workflow fields');
        console.log('  - payments table');
        console.log('  - chat_messages table');
        console.log('  - rental_progress table');
        console.log('  - notifications table');

    } catch (error) {
        console.error('Error setting up rental workflow:', error);
    } finally {
        await connection.end();
    }
}

setupRentalWorkflow();
