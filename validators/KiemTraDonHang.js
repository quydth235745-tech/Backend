/**
 * Order Validators
 * Validation logic separated from controllers and routes
 */

const xss = require('xss');

/**
 * Validate create order request body
 * Middleware that validates and sanitizes input
 */
exports.validateCreateOrder = (req, res, next) => {
  const { items, totalPrice, customerName, phone, address, customerEmail, couponCode } = req.body;
  
  const errors = [];

  // Validate items
  if (!Array.isArray(items) || items.length === 0) {
    errors.push('❌ Giỏ hàng trống! Vui lòng thêm món');
  } else {
    for (const item of items) {
      if (!item.foodId) errors.push('❌ Mỗi món phải có mã món');
      if (!item.name) errors.push('❌ Mỗi món phải có tên');
      if (item.price === undefined || typeof item.price !== 'number' || item.price < 0) {
        errors.push('❌ Giá phải là số dương');
      }
      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1) {
        errors.push('❌ Số lượng phải >= 1');
      }
      if (errors.length > 0) break;
    }
  }

  // Validate totalPrice
  if (totalPrice === undefined || typeof totalPrice !== 'number' || totalPrice < 0) {
    errors.push('❌ Tổng giá phải là số dương');
  }

  // Validate customerName
  if (!customerName || typeof customerName !== 'string') {
    errors.push('❌ Tên khách hàng không được để trống');
  } else if (customerName.trim().length < 2) {
    errors.push('❌ Tên phải ít nhất 2 ký tự');
  } else if (customerName.length > 100) {
    errors.push('❌ Tên không được vượt quá 100 ký tự');
  }

  // Validate customerEmail
  if (!customerEmail || typeof customerEmail !== 'string') {
    errors.push('❌ Email không được để trống');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      errors.push('❌ Email không hợp lệ');
    }
  }

  // Validate phone - Accept various formats (0XXXXXXXXX, +84XXXXXXXXX, or just 10+ digits)
  if (!phone || typeof phone !== 'string') {
    errors.push('❌ Số điện thoại không được để trống');
  } else {
    const phoneDigits = phone.replace(/\D/g, ''); // Remove non-digits
    if (phoneDigits.length < 9 || phoneDigits.length > 11) {
      errors.push('❌ Số điện thoại không hợp lệ (vui lòng nhập 9-11 chữ số)');
    }
  }

  // Validate address
  if (!address || typeof address !== 'string') {
    errors.push('❌ Địa chỉ không được để trống');
  } else if (address.trim().length < 5) {
    errors.push('❌ Địa chỉ phải ít nhất 5 ký tự');
  } else if (address.length > 500) {
    errors.push('❌ Địa chỉ không được vượt quá 500 ký tự');
  }

  // Validate couponCode (optional)
  if (couponCode !== undefined && couponCode !== null) {
    if (typeof couponCode !== 'string') {
      errors.push('❌ Mã khuyến mãi không hợp lệ');
    } else if (couponCode.trim().length > 30) {
      errors.push('❌ Mã khuyến mãi quá dài');
    }
  }

  // Return errors if any
  if (errors.length > 0) {
    return res.status(400).json({
      message: '❌ Xác thực thất bại',
      errors,
      fieldsRequired: ['items', 'totalPrice', 'customerName', 'phone', 'address', 'customerEmail']
    });
  }

  // Sanitize inputs against XSS
  req.body.customerName = xss(customerName.trim());
  req.body.customerEmail = xss(customerEmail.trim().toLowerCase());
  req.body.address = xss(address.trim());
  req.body.phone = phone.trim();
  req.body.couponCode = couponCode ? xss(String(couponCode).trim().toUpperCase()) : '';

  next();
};

/**
 * Validate update order status
 * Middleware for validating status update
 */
exports.validateUpdateStatus = (req, res, next) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'shipping', 'delivered', 'cancelled'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: [`Status must be one of: ${validStatuses.join(', ')}`],
    });
  }

  next();
};

/**
 * Validate order ID parameter
 * Middleware for validating MongoDB ObjectId
 */
exports.validateOrderId = (req, res, next) => {
  const { id } = req.params;
  
  // Simple MongoDB ObjectId validation
  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    return res.status(400).json({
      message: 'Invalid order ID format',
      errors: ['Order ID must be a valid MongoDB ObjectId']
    });
  }

  next();
};

/**
 * Validate pagination query params
 * Middleware for validating page and limit
 */
exports.validatePagination = (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: ['Page must be a positive integer']
    });
  }

  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: ['Limit must be between 1 and 100']
    });
  }

  // Attach validated values to request
  req.pagination = { page: pageNum, limit: limitNum };

  next();
};
