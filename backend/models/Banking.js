const { pool } = require('../config/database');

class Banking {
  // Get all banking records
  static async findAll() {
    const [rows] = await pool.query(`
      SELECT b.*, u.name as created_by_name 
      FROM banking b
      LEFT JOIN users u ON b.created_by = u.id
      ORDER BY b.created_at DESC
    `);
    return rows;
  }

  // Get banking record by ID
  static async findById(id) {
    const [rows] = await pool.query(`
      SELECT b.*, u.name as created_by_name 
      FROM banking b
      LEFT JOIN users u ON b.created_by = u.id
      WHERE b.id = ?
    `, [id]);
    return rows[0];
  }

  // Get active banking records
  static async findActive() {
    const [rows] = await pool.query(`
      SELECT b.*, u.name as created_by_name 
      FROM banking b
      LEFT JOIN users u ON b.created_by = u.id
      WHERE b.is_active = true
      ORDER BY b.created_at DESC
    `);
    return rows;
  }

  // Create new banking record
  static async create(data) {
    const { 
      bank_name, 
      bank_number, 
      account_holder_name, 
      account_type, 
      branch_name, 
      swift_code, 
      photo_scan, 
      purpose, 
      notes, 
      created_by 
    } = data;
    
    const [result] = await pool.query(
      `INSERT INTO banking 
      (bank_name, bank_number, account_holder_name, account_type, branch_name, swift_code, photo_scan, purpose, notes, created_by) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [bank_name, bank_number, account_holder_name, account_type || 'savings', branch_name, swift_code, photo_scan, purpose, notes, created_by]
    );
    return result.insertId;
  }

  // Update banking record
  static async update(id, data) {
    const { 
      bank_name, 
      bank_number, 
      account_holder_name, 
      account_type, 
      branch_name, 
      swift_code, 
      photo_scan, 
      purpose, 
      notes 
    } = data;
    
    const [result] = await pool.query(
      `UPDATE banking SET 
      bank_name = ?, 
      bank_number = ?, 
      account_holder_name = ?, 
      account_type = ?, 
      branch_name = ?, 
      swift_code = ?, 
      photo_scan = ?, 
      purpose = ?, 
      notes = ? 
      WHERE id = ?`,
      [bank_name, bank_number, account_holder_name, account_type, branch_name, swift_code, photo_scan, purpose, notes, id]
    );
    return result.affectedRows;
  }

  // Toggle active status
  static async toggleActive(id, isActive) {
    const [result] = await pool.query(
      'UPDATE banking SET is_active = ? WHERE id = ?',
      [isActive, id]
    );
    return result.affectedRows;
  }

  // Delete banking record
  static async delete(id) {
    const [result] = await pool.query('DELETE FROM banking WHERE id = ?', [id]);
    return result.affectedRows;
  }

  // Check if bank number exists
  static async existsByBankNumber(bankNumber, excludeId = null) {
    let query = 'SELECT COUNT(*) as count FROM banking WHERE bank_number = ?';
    const params = [bankNumber];
    
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    
    const [rows] = await pool.query(query, params);
    return rows[0].count > 0;
  }
}

module.exports = Banking;
