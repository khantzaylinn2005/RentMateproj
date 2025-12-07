const { pool } = require('../config/database');

// Helper function to generate next item ID
async function generateItemId() {
  const [rows] = await pool.query('SELECT item_id FROM items ORDER BY id DESC LIMIT 1');
  if (rows.length === 0) {
    return 'ITEM000001';
  }
  const lastId = rows[0].item_id;
  const num = parseInt(lastId.replace('ITEM', '')) + 1;
  return `ITEM${String(num).padStart(6, '0')}`;
}

// @desc    Get all items
// @route   GET /api/items
// @access  Public
exports.getAllItems = async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search, location, available } = req.query;
    
    let query = `
      SELECT i.*, u.name as owner_name, u.email as owner_email, u.location as owner_location, u.rating as owner_rating 
      FROM items i 
      JOIN users u ON i.owner_id = u.id 
      LEFT JOIN rentals r ON i.id = r.item_id 
        AND r.workflow_status IN ('payment_made', 'approved', 'lender_confirmed', 'active', 'borrower_returned')
      WHERE 1=1 AND r.id IS NULL
    `;
    const params = [];

    // Only show approved and active items for non-admin users
    // Admin users can see all items
    if (!req.user || req.user.role !== 'admin') {
      query += ' AND i.approval_status = ? AND i.is_active = ?';
      params.push('approved');
      params.push(true);
    }

    if (category) {
      query += ' AND i.category = ?';
      params.push(category);
    }
    if (location) {
      query += ' AND i.location LIKE ?';
      params.push(`%${location}%`);
    }
    if (minPrice) {
      query += ' AND i.price >= ?';
      params.push(minPrice);
    }
    if (maxPrice) {
      query += ' AND i.price <= ?';
      params.push(maxPrice);
    }
    if (search) {
      query += ' AND (i.name LIKE ? OR i.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (available !== undefined) {
      query += ' AND i.available = ?';
      params.push(available === 'true' ? 1 : 0);
    }

    query += ' ORDER BY i.created_at DESC';

    const [items] = await pool.query(query, params);

    res.json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single item
// @route   GET /api/items/:id
// @access  Public
exports.getItemById = async (req, res) => {
  try {
    const [items] = await pool.query(`
      SELECT i.*, u.name as owner_name, u.email as owner_email, u.location as owner_location, 
             u.phone as owner_phone, u.rating as owner_rating 
      FROM items i 
      JOIN users u ON i.owner_id = u.id 
      WHERE i.id = ?
    `, [req.params.id]);

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    const item = items[0];

    // Check if item has active rental
    const [activeRentals] = await pool.query(`
      SELECT id FROM rentals 
      WHERE item_id = ? 
      AND workflow_status IN ('payment_made', 'approved', 'lender_confirmed', 'active', 'borrower_returned')
      LIMIT 1
    `, [item.id]);

    // Set isAvailable based on active rentals
    item.isAvailable = activeRentals.length === 0 && item.available === 1;

    // Format owner data as object
    item.owner = {
      name: item.owner_name,
      email: item.owner_email,
      location: item.owner_location,
      phone: item.owner_phone,
      rating: item.owner_rating
    };

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new item
// @route   POST /api/items
// @access  Private
exports.createItem = async (req, res) => {
  try {
    // Check if user is a verified lender
    const [user] = await pool.query(
      'SELECT is_verified, verification_status, user_type FROM users WHERE id = ?',
      [req.user.id]
    );

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check is_verified OR verification_status
    const isVerified = user[0].is_verified === 1 || user[0].verification_status === 'verified';
    if (!isVerified || (user[0].user_type !== 'lender' && user[0].user_type !== 'both')) {
      return res.status(403).json({
        success: false,
        message: 'You must be a verified lender to list items. Please complete the verification process.'
      });
    }

    const { name, description, price, deposit, category, location, images, condition } = req.body;

    const itemId = await generateItemId();

    // Create item with 'pending' approval status (requires admin approval)
    const [result] = await pool.query(`
      INSERT INTO items (item_id, name, description, category, price, deposit, condition_status, location, owner_id, images, approval_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      itemId,
      name,
      description,
      category,
      price,
      deposit || 0,
      condition || 'good',
      location,
      req.user.id,
      JSON.stringify(images || [])
    ]);

    const [newItem] = await pool.query('SELECT * FROM items WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Item submitted for approval. Admin will review it shortly.',
      data: newItem[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update item
// @route   PUT /api/items/:id
// @access  Private
exports.updateItem = async (req, res) => {
  try {
    const [items] = await pool.query('SELECT * FROM items WHERE id = ?', [req.params.id]);

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    if (items[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this item'
      });
    }

    const { name, description, category, price, deposit, location, available, images, condition } = req.body;

    await pool.query(`
      UPDATE items 
      SET name = ?, description = ?, category = ?, price = ?, deposit = ?, condition_status = ?, location = ?, available = ?, images = ?
      WHERE id = ?
    `, [
      name,
      description,
      category,
      price,
      deposit,
      condition || items[0].condition_status,
      location,
      available !== undefined ? available : items[0].available,
      JSON.stringify(images),
      req.params.id
    ]);

    const [updatedItem] = await pool.query('SELECT * FROM items WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      data: updatedItem[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete item
// @route   DELETE /api/items/:id
// @access  Private
exports.deleteItem = async (req, res) => {
  try {
    const [items] = await pool.query('SELECT * FROM items WHERE id = ?', [req.params.id]);

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    if (items[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this item'
      });
    }

    await pool.query('DELETE FROM items WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'Item removed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get my items
// @route   GET /api/items/my/listings
// @access  Private
exports.getMyItems = async (req, res) => {
  try {
    const activeStatuses = [
      'payment_made',
      'admin_review',
      'approved',
      'lender_confirmed',
      'active',
      'borrower_returned',
      'return_pending',
      'return_completed'
    ];

    const statusPlaceholders = activeStatuses.map(() => '?').join(', ');

    const query = `
      SELECT i.*,
             EXISTS(
               SELECT 1
               FROM rentals r
               WHERE r.item_id = i.id
                 AND COALESCE(r.workflow_status, r.status) IN (${statusPlaceholders})
             ) AS has_active_rental
      FROM items i
      WHERE i.owner_id = ?
      ORDER BY i.created_at DESC
    `;

    const [items] = await pool.query(query, [...activeStatuses, req.user.id]);

    res.json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get pending items for admin approval
// @route   GET /api/items/pending
// @access  Private/Admin
exports.getPendingItems = async (req, res) => {
  try {
    const [items] = await pool.query(`
      SELECT i.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone, u.location as owner_location
      FROM items i
      JOIN users u ON i.owner_id = u.id
      WHERE i.approval_status = 'pending'
      ORDER BY i.created_at DESC
    `);

    res.json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Approve/Reject item (Admin)
// @route   PUT /api/items/approve/:id
// @access  Private/Admin
exports.approveItem = async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    const itemId = req.params.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "approved" or "rejected"'
      });
    }

    // Update item approval status
    await pool.query(
      'UPDATE items SET approval_status = ?, approval_date = ? WHERE id = ?',
      [status, new Date(), itemId]
    );

    const [items] = await pool.query(
      'SELECT i.*, u.name as owner_name FROM items i JOIN users u ON i.owner_id = u.id WHERE i.id = ?',
      [itemId]
    );

    res.json({
      success: true,
      message: `Item ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
      data: items[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Toggle item active status (enable/disable)
// @route   PUT /api/items/:id/toggle-status
// @access  Private (Owner only)
exports.toggleItemStatus = async (req, res) => {
  try {
    const itemId = req.params.id;
    const userId = req.user.id;

    // Check if item exists and belongs to user
    const [items] = await pool.query(
      'SELECT * FROM items WHERE id = ? AND owner_id = ?',
      [itemId, userId]
    );

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found or you do not own this item'
      });
    }

    const item = items[0];
    const newStatus = !item.is_active;

    // Update item status
    await pool.query(
      'UPDATE items SET is_active = ? WHERE id = ?',
      [newStatus, itemId]
    );

    res.json({
      success: true,
      message: newStatus ? 'Item enabled successfully' : 'Item disabled successfully',
      data: {
        id: itemId,
        is_active: newStatus
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
