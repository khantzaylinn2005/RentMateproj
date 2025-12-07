const mysql = require('mysql2/promise');
require('dotenv').config();

async function addReturnPhotoColumn() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'rentmate'
        });

        console.log('Connected to database');

        // Add return_photo column to rentals table
        await connection.query(`
            ALTER TABLE rentals 
            ADD COLUMN IF NOT EXISTS return_photo LONGTEXT NULL
        `);

        console.log('✅ return_photo column added successfully to rentals table');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

addReturnPhotoColumn();
