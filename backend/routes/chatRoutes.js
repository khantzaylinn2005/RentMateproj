const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    sendMessage,
    getMessages,
    getUnreadCount
} = require('../controllers/chatController');

router.post('/send', protect, sendMessage);
router.get('/:rental_id', protect, getMessages);
router.get('/unread/count', protect, getUnreadCount);

module.exports = router;
