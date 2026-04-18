/**
 * Order Service
 * Xử lý logic kinh doanh liên quan đến đơn hàng
 */

const Order = require('../models/DonHang');
const Food = require('../models/MonAn');
const User = require('../models/TaiKhoan');
const { sendEmail } = require('../utils/GuiEmail');

/**
 * Validate order items exist in database
 * @param {Array} items - Array of order items
 * @returns {Promise<Array>} Validated order items
 * @throws Error if any item not found
 */
exports.validateOrderItems = async (items) => {
  const orderItems = [];
  
  for (const item of items) {
    const food = await Food.findById(item.foodId);
    if (!food) {
      throw new Error(`Food item not found: ${item.name}`);
    }

    orderItems.push({
      foodId: item.foodId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    });
  }
  
  return orderItems;
};

/**
 * Calculate shipping fee based on distance
 * @param {Number} distance - Distance in kilometers
 * @returns {Number} Shipping fee in VND
 */
exports.calculateShippingFee = (distance) => {
  const baseFee = 5000; // 5,000 VND base fee
  const freeKm = 2; // First 2km covered by base fee
  const feePerKm = 2500; // 2,500 VND per extra km
  const maxFee = 30000; // Cap shipping at 30,000 VND
  
  if (!distance || distance <= 0) {
    return baseFee;
  }

  const safeDistance = Math.min(Math.max(distance, 0), 30);
  const extraKm = Math.max(0, Math.ceil(safeDistance) - freeKm);
  const shippingFee = baseFee + (extraKm * feePerKm);
  return Math.min(shippingFee, maxFee);
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Array} coord1 - [longitude, latitude] of restaurant
 * @param {Array} coord2 - [longitude, latitude] of delivery location
 * @returns {Number} Distance in kilometers
 */
exports.calculateDistance = (coord1, coord2) => {
  if (!coord1 || !coord2 || !Array.isArray(coord1) || !Array.isArray(coord2)) {
    return 0;
  }

  const [lng1, lat1] = coord1.map(Number);
  const [lng2, lat2] = coord2.map(Number);

  if ([lng1, lat1, lng2, lat2].some((value) => Number.isNaN(value))) {
    return 0;
  }

  // Haversine formula
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
};

/**
 * Create new order
 * @param {Object} orderData - Order data
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Created order
 */
exports.createOrder = async (orderData, userId) => {
  const { items, totalPrice, customerName, customerEmail, phone, address, deliveryLocation } = orderData;

  // Validate and prepare items
  const orderItems = await this.validateOrderItems(items);

  // Get user from database
  const user = await User.findById(userId);

  // Calculate total price from items (verify from frontend)
  const itemsTotal = orderItems.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  // Prepare order data
  const orderDataToSave = {
    items: orderItems,
    customerName,
    customerEmail: customerEmail || user.email,
    phone,
    address,
    userId,
    status: 'pending',
  };

  // Calculate distance and shipping fee if delivery location provided
  const restaurantLocation = [104.7666, 10.3699]; // [lng, lat] - Long Xuyên, An Giang
  let distance = 0;
  let calculatedShippingFee = 5000; // Default base fee

  if (deliveryLocation && deliveryLocation.coordinates && Array.isArray(deliveryLocation.coordinates) && deliveryLocation.coordinates.length === 2) {
    orderDataToSave.deliveryLocation = {
      type: 'Point',
      coordinates: deliveryLocation.coordinates
    };

    // Calculate distance and shipping fee
    distance = this.calculateDistance(restaurantLocation, deliveryLocation.coordinates);
    calculatedShippingFee = this.calculateShippingFee(distance);
    
    // Store distance in order
    orderDataToSave.distance = distance;
  } else {
    // If no delivery location, use default fees
    orderDataToSave.distance = 0;
  }

  // Store calculated shipping fee
  orderDataToSave.shippingFee = calculatedShippingFee;

  // Calculate final total price = items + shipping
  orderDataToSave.totalPrice = itemsTotal + calculatedShippingFee;

  const newOrder = new Order(orderDataToSave);
  const savedOrder = await newOrder.save();

  // Send confirmation email asynchronously (don't block)
  this.sendOrderConfirmationEmail(savedOrder).catch(err => {
    console.error('Failed to send confirmation email:', err.message);
  });

  return savedOrder;
};

/**
 * Format currency for Vietnam (VND)
 * @param {Number} amount - Amount in VND
 * @returns {String} Formatted string
 */
const formatVND = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

/**
 * Send order confirmation email
 * @param {Object} order - Order document
 */
exports.sendOrderConfirmationEmail = async (order) => {
  const user = await User.findById(order.userId).select('name email');
  
  if (!user?.email) {
    throw new Error('User email not found');
  }

  const itemsList = order.items
    .map(item => `  - ${item.name} x${item.quantity} = ${formatVND(item.price * item.quantity)}`)
    .join('\n');

  await sendEmail({
    to: user.email,
    subject: `Đơn hàng #${order._id.toString().slice(-8).toUpperCase()} được xác nhận`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>✅ Đơn hàng của bạn đã được xác nhận</h2>
        <p>Xin chào <strong>${user.name}</strong>,</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Mã đơn hàng:</strong> #${order._id.toString().slice(-8).toUpperCase()}</p>
          <p><strong>Địa chỉ giao:</strong> ${order.address}</p>
          <p><strong>Số điện thoại:</strong> ${order.phone}</p>
          <p><strong>Tổng tiền:</strong> ${formatVND(order.totalPrice)}</p>
        </div>

        <h3>Chi tiết đơn hàng:</h3>
        <pre style="background-color: #f5f5f5; padding: 10px; border-radius: 5px;">${itemsList}</pre>

        <p>Chúng tôi sẽ xác nhận thời gian giao hàng trong vòng 30 phút.</p>
        <p>Cảm ơn bạn đã lựa chọn chúng tôi! 🙏</p>
      </div>
    `,
  });
};

/**
 * Send order status update email
 * @param {Object} order - Order document
 * @param {String} status - New status
 */
exports.sendStatusUpdateEmail = async (order, status) => {
  const user = await User.findById(order.userId).select('name email');
  
  if (!user?.email) {
    return;
  }

  const statusMessages = {
    confirmed: {
      subject: 'Đơn hàng được xác nhận',
      message: 'Đơn hàng của bạn đã được xác nhận. Chúng tôi đang chuẩn bị hàng...'
    },
    preparing: {
      subject: 'Đơn hàng đang chuẩn bị',
      message: 'Đơn hàng của bạn đang được chuẩn bị. Vui lòng chờ...'
    },
    ready: {
      subject: 'Đơn hàng sẵn sàng',
      message: 'Đơn hàng của bạn đã sẵn sàng. Sẽ được giao ngay!'
    },
    shipping: {
      subject: 'Đơn hàng đang được giao',
      message: 'Đơn hàng của bạn đang trên đường. Sẽ tới nơi trong ~30 phút.'
    },
    delivered: {
      subject: 'Đơn hàng đã được giao',
      message: 'Đơn hàng của bạn đã được giao thành công. Cảm ơn bạn!'
    }
  };

  const statusInfo = statusMessages[status];
  if (!statusInfo) return;

  await sendEmail({
    to: user.email,
    subject: statusInfo.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>📦 ${statusInfo.subject}</h2>
        <p>Xin chào <strong>${user.name}</strong>,</p>
        <p>${statusInfo.message}</p>
        <p><strong>Mã đơn hàng:</strong> #${order._id.toString().slice(-8).toUpperCase()}</p>
        <p>---</p>
        <p>Cảm ơn bạn! 🙏</p>
      </div>
    `,
  });
};

/**
 * Get orders with filtering
 * @param {String} userId - User ID
 * @param {String} role - User role
 * @param {Object} filters - Additional filters
 * @returns {Promise<Array>} Orders list
 */
exports.getOrders = async (userId, role, filters = {}) => {
  // Build filter based on role
  let filter = filters;
  
  if (!['admin', 'manager', 'staff'].includes(role)) {
    // Regular users only see their own orders
    filter = { ...filter, userId };
  }

  const orders = await Order.find(filter)
    .populate('userId', 'name email phone')
    .sort({ createdAt: -1 });

  return orders;
};

/**
 * Get order by ID with permission check
 * @param {String} orderId - Order ID
 * @param {String} userId - User ID
 * @param {String} role - User role
 * @returns {Promise<Object>} Order document
 * @throws Error if not found or access denied
 */
exports.getOrderById = async (orderId, userId, role) => {
  const order = await Order.findById(orderId);
  
  if (!order) {
    throw new Error('Order not found');
  }

  // Check permission
  const isOwner = order.userId.toString() === userId.toString();
  const isStaff = ['admin', 'manager', 'staff'].includes(role);
  
  if (!isOwner && !isStaff) {
    throw new Error('Forbidden: Cannot access this order');
  }

  return order;
};

/**
 * Update order status
 * @param {String} orderId - Order ID
 * @param {String} newStatus - New status
 * @returns {Promise<Object>} Updated order
 * @throws Error if status invalid or order not found
 */
exports.updateOrderStatus = async (orderId, newStatus) => {
  const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'shipping', 'delivered', 'cancelled'];
  
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  // Update status
  order.status = newStatus;
  const now = new Date();

  // Update status timestamps
  switch (newStatus) {
    case 'confirmed':
      order.confirmedAt = now;
      break;
    case 'preparing':
      order.preparingAt = now;
      break;
    case 'ready':
      order.readyAt = now;
      break;
    case 'shipping':
      order.shippingAt = now;
      order.estimatedDelivery = new Date(now.getTime() + 30 * 60000); // +30 mins
      break;
    case 'delivered':
      order.deliveredAt = now;
      break;
    case 'cancelled':
      order.cancelReason = 'Cancelled by admin';
      break;
  }

  const updatedOrder = await order.save();

  // Send email notification asynchronously
  this.sendStatusUpdateEmail(updatedOrder, newStatus).catch(err => {
    console.error('Failed to send status email:', err.message);
  });

  return updatedOrder;
};

/**
 * Get order statistics for dashboard
 * @returns {Promise<Object>} Statistics
 */
exports.getOrderStats = async () => {
  const stats = await Order.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$totalPrice' },
      }
    }
  ]);

  const totalOrders = stats.reduce((sum, s) => sum + s.count, 0);
  const totalRevenue = stats.reduce((sum, s) => sum + s.totalRevenue, 0);

  return {
    totalOrders,
    totalRevenue,
    byStatus: stats,
  };
};
