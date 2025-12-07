const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  submitLenderVerification,
  getPendingVerifications,
  verifyLender,
  getBankAccounts
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/auth');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/bank-accounts', getBankAccounts);

// Private routes
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// Lender verification routes
router.post('/verify-lender', protect, submitLenderVerification);

// Admin routes
router.route('/')
  .get(protect, admin, getAllUsers);

router.get('/pending-verifications', protect, admin, getPendingVerifications);
router.put('/verify/:id', protect, admin, verifyLender);

router.route('/:id')
  .get(protect, admin, getUserById)
  .put(protect, admin, updateUser)
  .delete(protect, admin, deleteUser);

module.exports = router;
