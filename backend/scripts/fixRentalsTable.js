const mysql = require('mysql2/promise');

async function fixRentalsTable() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'rentmate'
    });

    try {
        console.log('Checking and fixing rentals table...');

        // Check if rental_id column exists
        const [columns] = await connection.query(`
            SHOW COLUMNS FROM rentals LIKE 'rental_id'
        `);

        if (columns.length === 0) {
            console.log('Adding rental_id column...');
            await connection.query(`
                ALTER TABLE rentals 
                ADD COLUMN rental_id VARCHAR(50) UNIQUE AFTER id
            `);
            console.log('✅ rental_id column added');
        } else {
            console.log('✅ rental_id column already exists');
        }

        // Check and add other missing columns
        const columnsToAdd = [
            { name: 'payment_amount', type: 'DECIMAL(10,2) DEFAULT 0' },
            { name: 'deposit_amount', type: 'DECIMAL(10,2) DEFAULT 0' },
            { name: 'payment_status', type: "ENUM('pending', 'paid', 'approved', 'transferred', 'refunded') DEFAULT 'pending'" },
            { name: 'payment_date', type: 'DATETIME NULL' },
            { name: 'admin_approved_at', type: 'DATETIME NULL' },
            { name: 'admin_approved_by', type: 'INT NULL' },
            { name: 'lender_paid_at', type: 'DATETIME NULL' },
            { name: 'item_returned_at', type: 'DATETIME NULL' },
            { name: 'return_confirmed_by_lender', type: 'TINYINT(1) DEFAULT 0' },
            { name: 'deposit_refunded_at', type: 'DATETIME NULL' },
            { name: 'workflow_status', type: "ENUM('payment_pending', 'payment_made', 'admin_review', 'approved', 'active', 'return_pending', 'completed', 'cancelled') DEFAULT 'payment_pending'" }
        ];

        for (const col of columnsToAdd) {
            const [exists] = await connection.query(`
                SHOW COLUMNS FROM rentals LIKE '${col.name}'
            `);

            if (exists.length === 0) {
                console.log(`Adding ${col.name} column...`);
                await connection.query(`
                    ALTER TABLE rentals 
                    ADD COLUMN ${col.name} ${col.type}
                `);
                console.log(`✅ ${col.name} column added`);
            } else {
                console.log(`✅ ${col.name} column already exists`);
            }
        }

        // Show final table structure
        console.log('\n=== Current Rentals Table Structure ===');
        const [tableColumns] = await connection.query('SHOW COLUMNS FROM rentals');
        tableColumns.forEach(col => {
            console.log(`- ${col.Field}: ${col.Type}`);
        });

        console.log('\n✅ Rentals table fixed successfully!');

    } catch (error) {
        console.error('Error fixing rentals table:', error);
    } finally {
        await connection.end();
    }
}

fixRentalsTable();
