const express = require('express');
const { protect, admin } = require('../middleware/auth');
const {
  createTicket,
  getMyTickets,
  getAllTickets,
  updateTicketStatus,
  getTicketMessages,
  addTicketReply
} = require('../controllers/supportController');

const router = express.Router();

router.post('/tickets', protect, createTicket);
router.get('/tickets', protect, getMyTickets);
router.get('/tickets/admin', protect, admin, getAllTickets);
router.put('/tickets/:id/status', protect, admin, updateTicketStatus);
router.get('/tickets/:id/messages', protect, getTicketMessages);
router.post('/tickets/:id/messages', protect, addTicketReply);

module.exports = router;
