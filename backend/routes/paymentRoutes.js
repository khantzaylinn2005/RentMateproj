const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    createPayment,
    approvePayment,
    transferToLender,
    refundDeposit,
    getPaymentHistory
} = require('../controllers/paymentController');

router.post('/create', protect, createPayment);
router.post('/approve', protect, approvePayment);
router.post('/transfer', protect, transferToLender);
router.post('/refund', protect, refundDeposit);
router.get('/history', protect, getPaymentHistory);

module.exports = router;
