/**
 * Order Controller
 * Handles request/response, delegates business logic to services
 */

const orderService = require('../services/DichVuDonHang');

/**
 * POST /api/orders
 * Create new order
 */
exports.createOrder = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const order = await orderService.createOrder(req.body, userId);

    res.status(201).json({
      message: 'Order created successfully',
      data: order
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/orders
 * Get orders for current user (or all if admin/manager/staff)
 */
exports.getOrders = async (req, res, next) => {
  try {
    const { _id: userId, role } = req.user;
    const orders = await orderService.getOrders(userId, role, req.query);

    res.json({
      message: 'Orders retrieved successfully',
      count: orders.length,
      data: orders
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/orders/:id
 * Get single order by ID
 */
exports.getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { _id: userId, role } = req.user;

    const order = await orderService.getOrderById(id, userId, role);

    res.json({
      message: 'Order retrieved successfully',
      data: order
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/orders/:id/status
 * Update order status (admin only)
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedOrder = await orderService.updateOrderStatus(id, status);

    res.json({
      message: `Order status updated to ${status}`,
      data: updatedOrder
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/orders/stats/dashboard
 * Get order statistics (admin only)
 */
exports.getOrderStats = async (req, res, next) => {
  try {
    const stats = await orderService.getOrderStats();

    res.json({
      message: 'Order statistics retrieved successfully',
      data: stats
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/calculate-shipping
 * Calculate shipping fee based on delivery location
 */
exports.calculateShipping = async (req, res, next) => {
  try {
    const { deliveryLocation, items } = req.body;

    if (!deliveryLocation || !deliveryLocation.coordinates) {
      return res.json({
        distance: 0,
        shippingFee: 5000, // Base fee
        totalShipping: 5000,
        itemsTotal: 0
      });
    }

    // Calculate distance
    const restaurantLocation = [104.7666, 10.3699]; // [lng, lat]
    const distance = orderService.calculateDistance(restaurantLocation, deliveryLocation.coordinates);
    const shippingFee = orderService.calculateShippingFee(distance);

    // Calculate items total if provided
    let itemsTotal = 0;
    if (items && Array.isArray(items)) {
      itemsTotal = items.reduce((sum, item) => {
        return sum + (Number(item.price || 0) * Number(item.quantity || 1));
      }, 0);
    }

    res.json({
      distance: distance,
      shippingFee: shippingFee,
      totalShipping: itemsTotal + shippingFee,
      itemsTotal: itemsTotal
    });
  } catch (err) {
    next(err);
  }
};
