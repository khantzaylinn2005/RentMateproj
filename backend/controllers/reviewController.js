const { pool } = require('../config/database');

// @desc    Create review
// @route   POST /api/reviews
// @access  Private
exports.createReview = async (req, res) => {
  try {
    const { rental_id, rating, comment, reviewee_id } = req.body;
    const reviewer_id = req.user.id;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if rental exists and is completed
    const [rentals] = await pool.query(
      'SELECT * FROM rentals WHERE id = ? AND status = ?',
      [rental_id, 'completed']
    );

    if (rentals.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rental not found or not completed'
      });
    }

    const rental = rentals[0];

    // Check if user is part of the rental
    if (rental.borrower_id !== reviewer_id && rental.lender_id !== reviewer_id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to review this rental'
      });
    }

    // Check if review already exists
    const [existingReview] = await pool.query(
      'SELECT * FROM reviews WHERE rental_id = ? AND reviewer_id = ? AND reviewee_id = ?',
      [rental_id, reviewer_id, reviewee_id]
    );

    if (existingReview.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this user for this rental'
      });
    }

    // Create review
    const [result] = await pool.query(
      'INSERT INTO reviews (rental_id, reviewer_id, reviewee_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [rental_id, reviewer_id, reviewee_id, rating, comment]
    );

    // Update user rating
    const [reviews] = await pool.query(
      'SELECT AVG(rating) as avgRating, COUNT(*) as totalRatings FROM reviews WHERE reviewee_id = ?',
      [reviewee_id]
    );

    await pool.query(
      'UPDATE users SET rating = ?, total_ratings = ? WHERE id = ?',
      [reviews[0].avgRating || 0, reviews[0].totalRatings || 0, reviewee_id]
    );

    // Remove review notification
    await pool.query(
      'DELETE FROM notifications WHERE user_id = ? AND rental_id = ? AND type = ?',
      [reviewer_id, rental_id, 'review_pending']
    );

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: { id: result.insertId, rental_id, reviewer_id, reviewee_id, rating, comment }
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get reviews for user
// @route   GET /api/reviews/user/:id
// @access  Public
exports.getUserReviews = async (req, res) => {
  try {
    const [reviews] = await pool.query(
      `SELECT r.*, u.name as reviewer_name, u.email as reviewer_email
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       WHERE r.reviewee_id = ?
       ORDER BY r.created_at DESC`,
      [req.params.id]
    );

    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get reviews for item
// @route   GET /api/reviews/item/:id
// @access  Public
exports.getItemReviews = async (req, res) => {
  try {
    const [reviews] = await pool.query(
      `SELECT r.*, u.name as reviewer_name, u.email as reviewer_email
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       JOIN rentals rt ON r.rental_id = rt.id
       WHERE rt.item_id = ?
       ORDER BY r.created_at DESC`,
      [req.params.id]
    );

    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Check if user can review
// @route   GET /api/reviews/can-review/:rentalId
// @access  Private
exports.canReview = async (req, res) => {
  try {
    const rentalId = req.params.rentalId;
    const userId = req.user.id;

    // Get rental details
    const [rentals] = await pool.query(
      'SELECT * FROM rentals WHERE id = ? AND status = ?',
      [rentalId, 'completed']
    );

    if (rentals.length === 0) {
      return res.json({
        success: true,
        canReview: false,
        message: 'Rental not found or not completed'
      });
    }

    const rental = rentals[0];

    // Check if user is part of rental
    if (rental.borrower_id !== userId && rental.lender_id !== userId) {
      return res.json({
        success: true,
        canReview: false,
        message: 'Not part of this rental'
      });
    }

    // Determine who should be reviewed
    const revieweeId = rental.borrower_id === userId ? rental.lender_id : rental.borrower_id;

    // Check if already reviewed
    const [existingReview] = await pool.query(
      'SELECT * FROM reviews WHERE rental_id = ? AND reviewer_id = ? AND reviewee_id = ?',
      [rentalId, userId, revieweeId]
    );

    res.json({
      success: true,
      canReview: existingReview.length === 0,
      revieweeId: revieweeId,
      hasReviewed: existingReview.length > 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

