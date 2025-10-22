const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  itemId: {
    type: String,
    unique: true,
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please add an item name'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  price: {
    type: Number,
    required: [true, 'Please add a price per day'],
    min: 0
  },
  deposit: {
    type: Number,
    required: [true, 'Please add a deposit amount'],
    min: 0
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: ['tent', 'sleeping-bag', 'backpack', 'cooking', 'lighting', 'clothing', 'other']
  },
  condition: {
    type: String,
    enum: ['new', 'like-new', 'good', 'fair'],
    default: 'good'
  },
  images: [{
    type: String
  }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  location: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Generate unique item ID before saving
itemSchema.pre('save', async function(next) {
  if (!this.itemId) {
    const count = await mongoose.model('Item').countDocuments();
    this.itemId = `ITEM${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Item', itemSchema);
