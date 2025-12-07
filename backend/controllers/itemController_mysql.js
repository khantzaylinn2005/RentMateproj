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

// Get All Items
exports.getAllItems = async (req, res) => {
  try {
    const { category, location, minPrice, maxPrice, available } = req.query;
    
    let query = `
      SELECT i.*, u.name as owner_name, u.rating as owner_rating 
      FROM items i 
      JOIN users u ON i.owner_id = u.id 
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      query += ' AND i.category = ?';
      params.push(category);
    }
    if (location) {
      query += ' AND i.location LIKE ?';
      params.push(`%${location}%`);
    }
    if (minPrice) {
      query += ' AND i.price_per_day >= ?';
      params.push(minPrice);
    }
    if (maxPrice) {
      query += ' AND i.price_per_day <= ?';
      params.push(maxPrice);
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
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Single Item
exports.getItemById = async (req, res) => {
  try {
    const [items] = await pool.query(`
      SELECT i.*, u.name as owner_name, u.rating as owner_rating, u.phone as owner_phone 
      FROM items i 
      JOIN users u ON i.owner_id = u.id 
      WHERE i.id = ?
    `, [req.params.id]);

    if (items.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.json({ success: true, data: items[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create Item
exports.createItem = async (req, res) => {
  try {
    const { name, description, category, price_per_day, deposit, location, images, specifications } = req.body;

    const itemId = await generateItemId();

    const [result] = await pool.query(`
      INSERT INTO items (item_id, name, description, category, price_per_day, deposit, location, owner_id, images, specifications)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      itemId,
      name,
      description,
      category,
      price_per_day,
      deposit || 0,
      location,
      req.user.id,
      JSON.stringify(images || []),
      JSON.stringify(specifications || {})
    ]);

    const [newItem] = await pool.query('SELECT * FROM items WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      data: newItem[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Item
exports.updateItem = async (req, res) => {
  try {
    const [items] = await pool.query('SELECT * FROM items WHERE id = ?', [req.params.id]);

    if (items.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    if (items[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { name, description, category, price_per_day, deposit, location, available, images, specifications } = req.body;

    await pool.query(`
      UPDATE items 
      SET name = ?, description = ?, category = ?, price_per_day = ?, deposit = ?, location = ?, available = ?, images = ?, specifications = ?
      WHERE id = ?
    `, [
      name,
      description,
      category,
      price_per_day,
      deposit,
      location,
      available,
      JSON.stringify(images),
      JSON.stringify(specifications),
      req.params.id
    ]);

    const [updatedItem] = await pool.query('SELECT * FROM items WHERE id = ?', [req.params.id]);

    res.json({ success: true, data: updatedItem[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Item
exports.deleteItem = async (req, res) => {
  try {
    const [items] = await pool.query('SELECT * FROM items WHERE id = ?', [req.params.id]);

    if (items.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    if (items[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await pool.query('DELETE FROM items WHERE id = ?', [req.params.id]);

    res.json({ success: true, message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get My Items
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
    res.status(500).json({ success: false, message: error.message });
  }
};
