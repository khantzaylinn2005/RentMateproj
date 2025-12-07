const express = require('express');
const router = express.Router();
const {
  getAllBanking,
  getBankingById,
  getActiveBanking,
  createBanking,
  updateBanking,
  toggleBankingStatus,
  deleteBanking
} = require('../controllers/bankingController');

// Public routes (for users to see payment options)
router.get('/active', getActiveBanking);

// Admin routes
router.get('/', getAllBanking);
router.get('/:id', getBankingById);
router.post('/', createBanking);
router.put('/:id', updateBanking);
router.put('/:id/toggle', toggleBankingStatus);
router.delete('/:id', deleteBanking);

module.exports = router;
