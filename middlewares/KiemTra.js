/**
 * Validation Middleware
 * Xác nhận request body trước khi xử lý
 */

const xss = require('xss');

// Sanitize và validate order
exports.validateCreateOrder = (req, res, next) => {
  const { items, customerName, phone, address, totalPrice } = req.body;

  const errors = [];

  // Validate items
  if (!Array.isArray(items) || items.length === 0) {
    errors.push('Items must be a non-empty array');
  } else {
    for (const item of items) {
      if (!item.foodId || !item.name || item.price === undefined || !item.quantity) {
        errors.push('Each item must have: foodId, name, price, quantity');
        break;
      }
      if (typeof item.price !== 'number' || item.price < 0) {
        errors.push('Item price must be a positive number');
        break;
      }
      if (typeof item.quantity !== 'number' || item.quantity < 1) {
        errors.push('Item quantity must be >= 1');
        break;
      }
    }
  }

  // Validate customerName
  if (!customerName || typeof customerName !== 'string') {
    errors.push('Customer name is required');
  } else if (customerName.trim().length < 2) {
    errors.push('Customer name must be at least 2 characters');
  } else if (customerName.length > 100) {
    errors.push('Customer name must not exceed 100 characters');
  }

  // Validate phone (Vietnamese format: 0XXXXXXXXX)
  if (!phone || typeof phone !== 'string') {
    errors.push('Phone is required');
  } else if (!/^0\d{9}$/.test(phone.trim())) {
    errors.push('Phone must be valid Vietnamese format (0XXXXXXXXX)');
  }

  // Validate address
  if (!address || typeof address !== 'string') {
    errors.push('Address is required');
  } else if (address.trim().length < 5) {
    errors.push('Address must be at least 5 characters');
  } else if (address.length > 500) {
    errors.push('Address must not exceed 500 characters');
  }

  // Validate totalPrice
  if (totalPrice !== undefined) {
    if (typeof totalPrice !== 'number' || totalPrice < 0) {
      errors.push('Total price must be a positive number');
    }
  }

  // Return errors if any
  if (errors.length > 0) {
    return res.status(400).json({
      message: 'Validation failed',
      errors,
    });
  }

  // Sanitize XSS attacks
  req.body.customerName = xss(customerName.trim());
  req.body.address = xss(address.trim());
  req.body.phone = phone.trim();

  next();
};

// Validate create food
exports.validateCreateFood = (req, res, next) => {
  const { name, price, category, description } = req.body;

  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Food name is required and must be at least 2 characters');
  } else if (name.length > 100) {
    errors.push('Food name must not exceed 100 characters');
  }

  if (!price || typeof price !== 'number' || price < 0) {
    errors.push('Price is required and must be a positive number');
  }

  if (!category || typeof category !== 'string' || category.trim().length < 2) {
    errors.push('Category is required and must be at least 2 characters');
  }

  if (description && description.length > 1000) {
    errors.push('Description must not exceed 1000 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      message: 'Validation failed',
      errors,
    });
  }

  // Sanitize
  req.body.name = xss(name.trim());
  req.body.category = xss(category.trim());
  if (description) req.body.description = xss(description);

  next();
};

// Validate authentication
exports.validateRegister = (req, res, next) => {
  const { email, password, name } = req.body;

  const errors = [];

  if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    errors.push('Valid email is required');
  }

  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      message: 'Validation failed',
      errors,
    });
  }

  req.body.name = xss(name.trim());
  req.body.email = email.toLowerCase().trim();

  next();
};

// Validate login
exports.validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: 'Email and password are required',
    });
  }

  req.body.email = email.toLowerCase().trim();

  next();
};

// Sanitize query parameters
exports.sanitizeQuery = (req, res, next) => {
  for (const key in req.query) {
    if (typeof req.query[key] === 'string') {
      req.query[key] = xss(req.query[key]);
    }
  }
  next();
};
