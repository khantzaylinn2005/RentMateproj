const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function addUserBankFields() {
    let connection;
    
    try {
        // Create connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'rentmate'
        });

        console.log('Connected to database');

        // Check if columns already exist
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'rentmate'}' 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME IN ('bank_acc_name', 'bank_number', 'bank_name', 'qr_code')
        `);

        const existingColumns = columns.map(col => col.COLUMN_NAME);
        console.log('Existing bank columns:', existingColumns);

        // Add bank_acc_name if it doesn't exist
        if (!existingColumns.includes('bank_acc_name')) {
            await connection.query(`
                ALTER TABLE users 
                ADD COLUMN bank_acc_name VARCHAR(255) NULL COMMENT 'Bank account holder name'
            `);
            console.log('✓ Added bank_acc_name column');
        } else {
            console.log('✓ bank_acc_name column already exists');
        }

        // Add bank_number if it doesn't exist
        if (!existingColumns.includes('bank_number')) {
            await connection.query(`
                ALTER TABLE users 
                ADD COLUMN bank_number VARCHAR(50) NULL COMMENT 'Bank account number'
            `);
            console.log('✓ Added bank_number column');
        } else {
            console.log('✓ bank_number column already exists');
        }

        // Add bank_name if it doesn't exist
        if (!existingColumns.includes('bank_name')) {
            await connection.query(`
                ALTER TABLE users 
                ADD COLUMN bank_name VARCHAR(255) NULL COMMENT 'Bank name'
            `);
            console.log('✓ Added bank_name column');
        } else {
            console.log('✓ bank_name column already exists');
        }

        // Add qr_code if it doesn't exist
        if (!existingColumns.includes('qr_code')) {
            await connection.query(`
                ALTER TABLE users 
                ADD COLUMN qr_code LONGTEXT NULL COMMENT 'QR code image for bank payment'
            `);
            console.log('✓ Added qr_code column');
        } else {
            console.log('✓ qr_code column already exists');
        }

        console.log('\n✅ User bank account fields setup completed successfully!');
        console.log('\nNew fields added to users table:');
        console.log('- bank_acc_name: Bank account holder name');
        console.log('- bank_number: Bank account number');
        console.log('- bank_name: Bank name');
        console.log('- qr_code: QR code image (base64)');

    } catch (error) {
        console.error('❌ Error setting up user bank fields:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('\nDatabase connection closed');
        }
    }
}

// Run the setup
addUserBankFields()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Failed to setup user bank fields:', error);
        process.exit(1);
    });
