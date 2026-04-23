const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  items: [{
    foodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    _id: false
  }],
  totalPrice: { 
    type: Number, 
    required: true, 
    min: 0,
    set: val => parseFloat(val.toFixed(2))
  },
  itemsTotal: {
    type: Number,
    default: 0,
    min: 0
  },
  shippingFee: { type: Number, default: 0 },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  couponCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  distance: { 
    type: Number, 
    default: 0,
    min: 0,
    description: 'Khoảng cách giao hàng (km)'
  },
  // Customer info
  customerName: { type: String, required: true, trim: true },
  customerEmail: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  
  // Geolocation - GeoJSON for geospatial queries (completely optional)
  deliveryLocation: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: {
      type: [Number], // [lng, lat]
      minlength: 2,
      maxlength: 2
    }
  },
  
  // Order status lifecycle
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'shipping', 'delivered', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Payment
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'wallet'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  
  // Timeline timestamps
  confirmedAt: Date,
  preparingAt: Date,
  readyAt: Date,
  shippingAt: Date,
  deliveredAt: Date,
  estimatedDelivery: Date,
  
  // Metadata
  notes: { type: String, maxlength: 500 },
  cancelReason: String,
  
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes for performance
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'deliveryLocation': '2dsphere' }); // Geospatial index

module.exports = mongoose.model('Order', orderSchema);