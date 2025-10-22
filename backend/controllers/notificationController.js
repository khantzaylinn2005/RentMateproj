const { pool } = require('../config/database');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const [notifications] = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.user.id]
    );

    res.json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-read
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const [notification] = await pool.query(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (notification.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const [notification] = await pool.query(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (notification.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await pool.query('DELETE FROM notifications WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread/count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const [result] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );

    res.json({
      success: true,
      count: result[0].count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
