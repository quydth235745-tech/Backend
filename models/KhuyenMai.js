const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  // Coupon info
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    match: /^[A-Z0-9\-]{3,20}$/, // Alphanumeric and hyphens, 3-20 chars
    index: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  
  // Discount details
  discountType: {
    type: String,
    enum: ['percent', 'fixed'],
    default: 'percent',
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  maxDiscountAmount: {
    type: Number, // Max discount in VND (for percent-based coupons)
    min: 0
  },
  minOrderValue: {
    type: Number,
    default: 0,
    min: 0 // Minimum order value to use coupon
  },
  
  // Usage limits
  maxUses: {
    type: Number,
    required: true,
    min: 1 // Total number of times coupon can be used
  },
  maxUsesPerUser: {
    type: Number,
    default: 1,
    min: 1 // Number of times one user can use this coupon
  },
  usedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Validity period
  validFrom: {
    type: Date,
    required: true,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  
  // Restrictions
  applicableFoods: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Food'
  }],
  applicableCategories: [String],
  excludedFoods: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Food'
  }],
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Tracking
  usedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    usedAt: {
      type: Date,
      default: Date.now
    },
    orderValue: Number,
    discountApplied: Number
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Indexes for performance
couponSchema.index({ code: 1, isActive: 1 });
couponSchema.index({ validFrom: 1, expiresAt: 1 });
couponSchema.index({ usedCount: -1 }); // Most used coupons
couponSchema.index({ isActive: 1, expiresAt: 1 }); // Active and not expired

module.exports = mongoose.model('Coupon', couponSchema);
