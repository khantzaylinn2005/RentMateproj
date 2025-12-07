const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    createPayment,
    approvePayment,
    transferToLender,
    refundDeposit,
    processFinalPayments,
    getPaymentHistory
} = require('../controllers/paymentController');

router.post('/create', protect, createPayment);
router.post('/approve', protect, approvePayment);
router.post('/transfer', protect, transferToLender);
router.post('/refund', protect, refundDeposit); // Legacy - for compatibility
router.post('/process-final', protect, processFinalPayments); // New endpoint
router.get('/history', protect, getPaymentHistory);

module.exports = router;
