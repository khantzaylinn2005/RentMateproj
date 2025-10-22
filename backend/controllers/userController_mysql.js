const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Register User
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, location, phone, passportNo } = req.body;

    const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, location, phone, passport_no) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, location, phone, passportNo]
    );

    const [newUser] = await pool.query('SELECT id, name, email, location, phone, role, rating FROM users WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      data: {
        ...newUser[0],
        token: generateToken(result.insertId)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Login User
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        location: user.location,
        phone: user.phone,
        role: user.role,
        rating: user.rating,
        token: generateToken(user.id)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get User Profile
exports.getUserProfile = async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, name, email, location, phone, passport_no, role, rating, total_ratings, is_verified, created_at FROM users WHERE id = ?', [req.user.id]);
    
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: users[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update User Profile
exports.updateUserProfile = async (req, res) => {
  try {
    const { name, location, phone } = req.body;

    await pool.query(
      'UPDATE users SET name = ?, location = ?, phone = ? WHERE id = ?',
      [name, location, phone, req.user.id]
    );

    const [users] = await pool.query('SELECT id, name, email, location, phone, role, rating FROM users WHERE id = ?', [req.user.id]);

    res.json({ success: true, data: users[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get All Users (Admin)
exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, name, email, location, phone, passport_no, role, rating, total_ratings, is_verified, created_at FROM users ORDER BY created_at DESC');

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete User (Admin)
exports.deleteUser = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
