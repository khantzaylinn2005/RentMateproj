const express = require('express');
const router = express.Router();
const {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getMyItems,
  getPendingItems,
  approveItem,
  toggleItemStatus
} = require('../controllers/itemController');
const { protect, admin } = require('../middleware/auth');

router.route('/')
  .get(getAllItems)
  .post(protect, createItem);

router.get('/my/listings', protect, getMyItems);

// Admin routes for item approval
router.get('/pending', protect, admin, getPendingItems);
router.put('/approve/:id', protect, admin, approveItem);

// Toggle item active status
router.put('/:id/toggle-status', protect, toggleItemStatus);

router.route('/:id')
  .get(getItemById)
  .put(protect, updateItem)
  .delete(protect, deleteItem);

module.exports = router;
