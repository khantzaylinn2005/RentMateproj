const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAllAsRead,
  markAsRead,
  deleteNotification,
  getUnreadCount
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getNotifications);
router.get('/unread/count', protect, getUnreadCount);
router.put('/mark-read', protect, markAllAsRead);
router.put('/:id/read', protect, markAsRead);
router.delete('/:id', protect, deleteNotification);

module.exports = router;
