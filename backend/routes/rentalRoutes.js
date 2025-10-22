const express = require('express');
const router = express.Router();
const {
  createRental,
  getAllRentals,
  getMyBorrowing,
  getMyLending,
  updateRentalStatus,
  deleteRental,
  confirmReturn,
  getRentalProgress,
  getMyChats
} = require('../controllers/rentalController');
const { protect, admin } = require('../middleware/auth');

router.route('/')
  .post(protect, createRental)
  .get(protect, admin, getAllRentals);

router.get('/myborrowing', protect, getMyBorrowing);
router.get('/mylending', protect, getMyLending);
router.get('/my-chats', protect, getMyChats);
router.get('/progress/:rental_id', protect, getRentalProgress);

router.put('/:id/status', protect, updateRentalStatus);
router.post('/confirm-return', protect, confirmReturn);
router.delete('/:id', protect, admin, deleteRental);

module.exports = router;
