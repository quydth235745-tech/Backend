const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  // Foods in wishlist
  foods: [{
    foodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Food',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      maxlength: 200
    }
  }],
  
  // Summary
  totalItems: {
    type: Number,
    default: 0,
    min: 0
  },
  totalValue: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Metadata
  lastModified: {
    type: Date,
    default: Date.now
  },
  isPublic: {
    type: Boolean,
    default: false // Can other users see this wishlist?
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indexes for performance
wishlistSchema.index({ userId: 1, createdAt: -1 });
wishlistSchema.index({ 'foods.foodId': 1 });
wishlistSchema.index({ isPublic: 1, createdAt: -1 }); // Public wishlists

module.exports = mongoose.model('Wishlist', wishlistSchema);
