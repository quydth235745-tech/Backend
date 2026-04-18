const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  userName: { 
    type: String, 
    required: true,
    trim: true
  },
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 
  },
  comment: { 
    type: String, 
    required: true,
    minlength: 5,
    maxlength: 500
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  }
}, { _id: false });

const foodSchema = new mongoose.Schema({
  // Basic info
  name: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
    index: true
  },
  price: { 
    type: Number, 
    required: true,
    min: 0,
    max: 10000000, // Max 10M VND
    set: val => parseFloat(val.toFixed(2))
  },
  category: { 
    type: String, 
    required: true,
    trim: true,
    index: true
  },
  description: { 
    type: String,
    maxlength: 1000
  },
  
  // Media
  image: { 
    type: String // Cloudinary URL or image URL
  },
  
  // Promotion
  promotion: { 
    type: String,
    maxlength: 100
  },
  discountPercent: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Reviews & ratings
  reviews: [reviewSchema],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: 0
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
foodSchema.index({ name: 'text', description: 'text', category: 'text' }); // Text search
foodSchema.index({ category: 1, isActive: 1 });
foodSchema.index({ averageRating: -1 }); // Popular foods
foodSchema.index({ createdAt: -1 }); // Newest foods

module.exports = mongoose.model('Food', foodSchema);