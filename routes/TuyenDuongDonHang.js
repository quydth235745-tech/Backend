const express = require('express');
const router = express.Router();
const auth = require('../middlewares/XacThuc');
const authorize = require('../middlewares/PhanQuyen');
const { 
  validateCreateOrder, 
  validateUpdateStatus, 
  validateOrderId,
  validatePagination 
} = require('../validators/KiemTraDonHang');
const orderController = require('../controllers/ControllerDonHang');

/**
 * POST /api/orders
 * Create new order
 * Middleware: auth, validateCreateOrder
 */
router.post('/', 
  auth, 
  validateCreateOrder, 
  orderController.createOrder
);

/**
 * GET /api/orders
 * Get all orders (or user's orders if not admin)
 * Middleware: auth, validatePagination
 */
router.get('/', 
  auth, 
  validatePagination, 
  orderController.getOrders
);

/**
 * GET /api/orders/stats/dashboard
 * Get order statistics
 * Middleware: auth, authorize admin only
 * NOTE: Must be defined BEFORE :id route
 */
router.get('/stats/dashboard',
  auth,
  authorize('admin', 'manager'),
  orderController.getOrderStats
);

/**
 * POST /api/calculate-shipping
 * Calculate shipping fee based on delivery location
 * No auth required (public calculation)
 */
router.post('/calculate-shipping', orderController.calculateShipping);

/**
 * GET /api/orders/:id
 * Get single order by ID
 * Middleware: auth, validateOrderId
 */
router.get('/:id',
  auth,
  validateOrderId,
  orderController.getOrderById
);

/**
 * PATCH /api/orders/:id/status
 * Update order status
 * Middleware: auth, authorize admin only, validateOrderId, validateUpdateStatus
 */
router.patch('/:id/status',
  auth,
  authorize('admin', 'manager', 'staff'),
  validateOrderId,
  validateUpdateStatus,
  orderController.updateOrderStatus
);

module.exports = router;
