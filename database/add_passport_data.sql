-- Add sample passport numbers to existing users
-- Run this SQL script in your MySQL database

USE rentmate;

-- Update existing users with passport numbers
UPDATE users SET passport_no = 'TH123456789' WHERE email = '6631502022@lamduan.mfu.ac.th';
UPDATE users SET passport_no = 'TH987654321' WHERE email = '6631502021@lamduan.mfu.ac.th';
UPDATE users SET passport_no = 'TH555666777' WHERE email = 'test@gmail.com';
UPDATE users SET passport_no = 'US123456789' WHERE email = 'john@example.com';
UPDATE users SET passport_no = 'US987654321' WHERE email = 'jane@example.com';
UPDATE users SET passport_no = 'TH111222333' WHERE email = '6631502028@lamduan.mfu.ac.th';
UPDATE users SET passport_no = 'ADMIN001' WHERE email = 'admin@rentmate.com';

-- Verify the updates
SELECT id, name, email, passport_no FROM users;
