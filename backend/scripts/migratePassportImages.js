const mysql = require('mysql2/promise');
require('dotenv').config();

const migratePassportImages = async () => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rentmate'
    });

    console.log('Connected to MySQL');

    // Check if passport_images column exists
    const [columns] = await connection.query(
      `SHOW COLUMNS FROM users LIKE 'passport_images'`
    );

    if (columns.length === 0) {
      console.log('Adding passport_images column...');
      
      // Add the new column
      await connection.query(
        `ALTER TABLE users ADD COLUMN passport_images LONGTEXT NULL AFTER passport_no`
      );

      console.log('✓ passport_images column added successfully');

      // Migrate existing passport_image data to passport_images array
      console.log('Migrating existing passport_image data...');
      
      const [usersWithOldImages] = await connection.query(
        `SELECT id, passport_image FROM users WHERE passport_image IS NOT NULL AND passport_image != ''`
      );

      for (const user of usersWithOldImages) {
        const imagesArray = [user.passport_image];
        await connection.query(
          `UPDATE users SET passport_images = ? WHERE id = ?`,
          [JSON.stringify(imagesArray), user.id]
        );
      }

      console.log(`✓ Migrated ${usersWithOldImages.length} user(s) passport images`);

      // Optionally drop the old passport_image column (commented out for safety)
      // await connection.query(`ALTER TABLE users DROP COLUMN passport_image`);
      // console.log('✓ Old passport_image column dropped');

      console.log('\n✓ Migration completed successfully!');
    } else {
      console.log('passport_images column already exists. No migration needed.');
    }

  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

migratePassportImages();
