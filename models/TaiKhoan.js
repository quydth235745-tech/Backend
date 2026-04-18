const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    index: true
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    match: /^0\d{9}$/ // Vietnam phone format
  },
  avatar: String, // Avatar URL
  address: String, // Default delivery address
  
  // Role-based access control
  role: { 
    type: String, 
    enum: ['user', 'admin', 'manager', 'staff'],
    default: 'user',
    index: true
  },
  
  // Account status
  isBanned: { 
    type: Boolean, 
    default: false,
    index: true
  },
  bannedReason: String,
  bannedAt: Date,
  
  // Account verification
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  
  // Preferences
  preferences: {
    notifications: { type: Boolean, default: true },
    newsletter: { type: Boolean, default: false }
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
  },
  lastLoginAt: Date
}, { timestamps: true });

// Indexes for performance
userSchema.index({ email: 1, isBanned: 1 });
userSchema.index({ role: 1, isBanned: 1 });
userSchema.index({ createdAt: -1 }); // Recent users

module.exports = mongoose.model('User', userSchema);