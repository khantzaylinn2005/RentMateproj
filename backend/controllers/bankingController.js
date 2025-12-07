const Banking = require('../models/Banking');

// @desc    Get all banking records
// @route   GET /api/banking
// @access  Admin
exports.getAllBanking = async (req, res) => {
  try {
    const banking = await Banking.findAll();
    res.json({
      success: true,
      count: banking.length,
      data: banking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get banking record by ID
// @route   GET /api/banking/:id
// @access  Admin
exports.getBankingById = async (req, res) => {
  try {
    const banking = await Banking.findById(req.params.id);
    
    if (!banking) {
      return res.status(404).json({
        success: false,
        message: 'Banking record not found'
      });
    }

    res.json({
      success: true,
      data: banking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get active banking records
// @route   GET /api/banking/active
// @access  Public (for displaying payment options)
exports.getActiveBanking = async (req, res) => {
  try {
    const banking = await Banking.findActive();
    res.json({
      success: true,
      count: banking.length,
      data: banking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new banking record
// @route   POST /api/banking
// @access  Admin
exports.createBanking = async (req, res) => {
  try {
    const { bank_name, bank_number, account_holder_name } = req.body;

    // Validate required fields
    if (!bank_name || !bank_number || !account_holder_name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide bank_name, bank_number, and account_holder_name'
      });
    }

    // Check if bank number already exists
    const exists = await Banking.existsByBankNumber(bank_number);
    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'Bank account number already exists'
      });
    }

    const bankingId = await Banking.create(req.body);
    const banking = await Banking.findById(bankingId);

    res.status(201).json({
      success: true,
      message: 'Bank account added successfully',
      data: banking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update banking record
// @route   PUT /api/banking/:id
// @access  Admin
exports.updateBanking = async (req, res) => {
  try {
    const banking = await Banking.findById(req.params.id);
    
    if (!banking) {
      return res.status(404).json({
        success: false,
        message: 'Banking record not found'
      });
    }

    // Check if bank number already exists (excluding current record)
    if (req.body.bank_number) {
      const exists = await Banking.existsByBankNumber(req.body.bank_number, req.params.id);
      if (exists) {
        return res.status(400).json({
          success: false,
          message: 'Bank account number already exists'
        });
      }
    }

    await Banking.update(req.params.id, req.body);
    const updatedBanking = await Banking.findById(req.params.id);

    res.json({
      success: true,
      message: 'Bank account updated successfully',
      data: updatedBanking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Toggle banking active status
// @route   PUT /api/banking/:id/toggle
// @access  Admin
exports.toggleBankingStatus = async (req, res) => {
  try {
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_active must be a boolean value'
      });
    }

    const banking = await Banking.findById(req.params.id);
    
    if (!banking) {
      return res.status(404).json({
        success: false,
        message: 'Banking record not found'
      });
    }

    await Banking.toggleActive(req.params.id, is_active);
    const updatedBanking = await Banking.findById(req.params.id);

    res.json({
      success: true,
      message: `Bank account ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: updatedBanking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete banking record
// @route   DELETE /api/banking/:id
// @access  Admin
exports.deleteBanking = async (req, res) => {
  try {
    const banking = await Banking.findById(req.params.id);
    
    if (!banking) {
      return res.status(404).json({
        success: false,
        message: 'Banking record not found'
      });
    }

    await Banking.delete(req.params.id);

    res.json({
      success: true,
      message: 'Bank account deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
