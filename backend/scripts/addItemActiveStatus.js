const mysql = require('mysql2/promise');
require('dotenv').config();

async function addItemActiveStatus() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'rentmate'
        });

        console.log('Connected to database');

        // Add is_active column to items table
        await connection.query(`
            ALTER TABLE items 
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true AFTER available
        `);

        console.log('✅ is_active column added successfully to items table');
        console.log('   - is_active = true: Item is enabled and visible in browse');
        console.log('   - is_active = false: Item is disabled and hidden from browse');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

addItemActiveStatus();
