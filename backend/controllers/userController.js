const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, location, phone } = req.body;

    // Check if user exists
    const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (default: borrower, unverified)
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, location, phone, user_type, verification_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, location, phone, 'borrower', 'unverified']
    );

    const [newUser] = await pool.query(
      'SELECT id, name, email, location, phone, role, user_type, verification_status, rating, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: {
        ...newUser[0],
        token: generateToken(result.insertId)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = users[0];

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        location: user.location,
        phone: user.phone,
        passportNo: user.passport_no,
        role: user.role,
        rating: user.rating,
        bank_acc_name: user.bank_acc_name,
        bank_number: user.bank_number,
        bank_name: user.bank_name,
        created_at: user.created_at,
        token: generateToken(user.id)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, location, phone, passport_no, role, rating, total_ratings, is_verified, bank_acc_name, bank_number, bank_name, qr_code, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  try {
    const { name, email, location, phone, password, bank_acc_name, bank_number, bank_name, qr_code } = req.body;

    let query = 'UPDATE users SET name = ?, email = ?, location = ?, phone = ?';
    let params = [name, email, location, phone];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    // Add bank fields if provided
    if (bank_acc_name !== undefined) {
      query += ', bank_acc_name = ?';
      params.push(bank_acc_name);
    }
    if (bank_number !== undefined) {
      query += ', bank_number = ?';
      params.push(bank_number);
    }
    if (bank_name !== undefined) {
      query += ', bank_name = ?';
      params.push(bank_name);
    }
    if (qr_code !== undefined) {
      query += ', qr_code = ?';
      params.push(qr_code);
    }

    query += ' WHERE id = ?';
    params.push(req.user.id);

    await pool.query(query, params);

    const [users] = await pool.query(
      'SELECT id, name, email, location, phone, passport_no, role, rating, bank_acc_name, bank_number, bank_name, qr_code FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        ...users[0],
        token: generateToken(users[0].id)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all users (Admin)
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, location, phone, role, rating, total_ratings, is_verified, created_at FROM users ORDER BY created_at DESC'
    );
    
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user by ID (Admin)
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, location, phone, passport_no, role, rating, total_ratings, is_verified, created_at FROM users WHERE id = ?',
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update user (Admin)
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const { name, email, location, phone, role } = req.body;

    await pool.query(
      'UPDATE users SET name = ?, email = ?, location = ?, phone = ?, role = ? WHERE id = ?',
      [name, email, location, phone, role, req.params.id]
    );

    const [users] = await pool.query(
      'SELECT id, name, email, location, phone, role, rating FROM users WHERE id = ?',
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete user (Admin)
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User removed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Submit lender verification
// @route   POST /api/users/verify-lender
// @access  Private
exports.submitLenderVerification = async (req, res) => {
  try {
    const { passportNo, passportImages } = req.body;
    const userId = req.user.id;

    // Check if already verified or pending
    const [user] = await pool.query(
      'SELECT verification_status, user_type FROM users WHERE id = ?',
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user[0].verification_status === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'User is already verified'
      });
    }

    if (user[0].verification_status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Verification is already pending approval'
      });
    }

    // Check passport number uniqueness
    if (passportNo) {
      const [existingPassport] = await pool.query(
        'SELECT id FROM users WHERE passport_no = ? AND id != ?',
        [passportNo, userId]
      );
      if (existingPassport.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Passport number already registered'
        });
      }
    }

    // Convert passportImages array to JSON string for storage
    const imagesJson = JSON.stringify(passportImages || []);

    // Update user verification status to pending
    await pool.query(
      'UPDATE users SET passport_no = ?, passport_images = ?, verification_status = ? WHERE id = ?',
      [passportNo, imagesJson, 'pending', userId]
    );

    res.json({
      success: true,
      message: 'Verification submitted successfully. Please wait for admin approval.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get pending verifications (Admin)
// @route   GET /api/users/pending-verifications
// @access  Private/Admin
exports.getPendingVerifications = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, phone, location, passport_no, passport_images, created_at FROM users WHERE verification_status = ? ORDER BY created_at DESC',
      ['pending']
    );

    // Parse passport_images JSON for each user
    const usersWithParsedImages = users.map(user => ({
      ...user,
      passport_images: user.passport_images ? JSON.parse(user.passport_images) : []
    }));

    res.json({
      success: true,
      data: usersWithParsedImages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Approve/Reject lender verification (Admin)
// @route   PUT /api/users/verify/:id
// @access  Private/Admin
exports.verifyLender = async (req, res) => {
  try {
    const { status } = req.body; // 'verified' or 'rejected'
    const userId = req.params.id;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "verified" or "rejected"'
      });
    }

    // Update verification status, set user_type, and set is_verified
    const updateData = status === 'verified' 
      ? { verification_status: 'verified', user_type: 'both', is_verified: 1, verification_date: new Date() }
      : { verification_status: 'rejected', is_verified: 0, verification_date: new Date() };

    await pool.query(
      status === 'verified'
        ? 'UPDATE users SET verification_status = ?, user_type = ?, is_verified = ?, verification_date = ? WHERE id = ?'
        : 'UPDATE users SET verification_status = ?, is_verified = ?, verification_date = ? WHERE id = ?',
      status === 'verified' 
        ? [updateData.verification_status, updateData.user_type, updateData.is_verified, updateData.verification_date, userId]
        : [updateData.verification_status, updateData.is_verified, updateData.verification_date, userId]
    );

    const [users] = await pool.query(
      'SELECT id, name, email, verification_status, user_type, is_verified FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: `User ${status === 'verified' ? 'verified' : 'rejected'} successfully`,
      data: users[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all bank accounts with QR codes (for payment)
// @route   GET /api/users/bank-accounts
// @access  Public
exports.getBankAccounts = async (req, res) => {
  try {
    const [accounts] = await pool.query(
      `SELECT 
        account_holder_name as bank_acc_name,
        bank_number,
        bank_name,
        photo_scan as qr_code,
        branch_name,
        account_type
       FROM banking 
       WHERE is_active = 1
       ORDER BY created_at DESC 
       LIMIT 10`
    );

    res.json({
      success: true,
      data: accounts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
