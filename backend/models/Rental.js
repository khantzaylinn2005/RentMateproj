const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema({
  rentalId: {
    type: String,
    unique: true,
    required: true
  },
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  borrower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  totalDays: {
    type: Number,
    required: true
  },
  pricePerDay: {
    type: Number,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  },
  deposit: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'active', 'completed', 'cancelled', 'rejected'],
    default: 'pending'
  },
  depositReturned: {
    type: Boolean,
    default: false
  },
  returnDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Generate unique rental ID
rentalSchema.pre('save', async function(next) {
  if (!this.rentalId) {
    const count = await mongoose.model('Rental').countDocuments();
    this.rentalId = `RNT${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Rental', rentalSchema);
