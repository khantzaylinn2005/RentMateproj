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
  confirmItemLended,
  confirmItemReceived,
  confirmItemReturn,
  confirmReturnReceived,
  getRentalProgress,
  getMyChats,
  rejectRental,
  updateRefundBankInfo
} = require('../controllers/rentalController');
const { protect, admin } = require('../middleware/auth');

router.route('/')
  .post(protect, createRental)
  .get(protect, admin, getAllRentals);

router.get('/myborrowing', protect, getMyBorrowing);
router.get('/mylending', protect, getMyLending);
router.get('/my-chats', protect, getMyChats);
router.get('/progress/:rental_id', protect, getRentalProgress);

router.post('/:id/refund-info', protect, updateRefundBankInfo);
router.put('/:id/status', protect, updateRentalStatus);
router.post('/:id/reject', protect, admin, rejectRental);

// New workflow steps
router.post('/confirm-lended', protect, confirmItemLended);         // Lender confirms item lended
router.post('/confirm-received', protect, confirmItemReceived);     // Borrower confirms receiving item
router.post('/confirm-return', protect, confirmItemReturn);         // Borrower confirms returning item
router.post('/confirm-return-received', protect, confirmReturnReceived); // Lender confirms receiving back

router.delete('/:id', protect, admin, deleteRental);

module.exports = router;
