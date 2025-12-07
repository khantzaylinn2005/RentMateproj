const express = require('express');
const router = express.Router();
const {
  createReview,
  getUserReviews,
  getItemReviews,
  canReview
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createReview);
router.get('/user/:id', getUserReviews);
router.get('/item/:id', getItemReviews);
router.get('/can-review/:rentalId', protect, canReview);

module.exports = router;
