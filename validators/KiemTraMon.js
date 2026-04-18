/**
 * Food Validators
 * Validation logic for food routes
 */

const xss = require('xss');

/**
 * Validate create food request
 */
exports.validateCreateFood = (req, res, next) => {
  const { name, price, category, description, image } = req.body;
  
  const errors = [];

  // Validate name
  if (!name || typeof name !== 'string') {
    errors.push('Food name is required');
  } else if (name.trim().length < 2) {
    errors.push('Food name must be at least 2 characters');
  } else if (name.length > 100) {
    errors.push('Food name must not exceed 100 characters');
  }

  // Validate price
  if (price === undefined || typeof price !== 'number') {
    errors.push('Price is required and must be a number');
  } else if (price < 0) {
    errors.push('Price must be a positive number');
  } else if (price > 10000000) {
    errors.push('Price is too high');
  }

  // Validate category
  if (!category || typeof category !== 'string') {
    errors.push('Category is required');
  } else if (category.trim().length < 2) {
    errors.push('Category must be at least 2 characters');
  } else if (category.length > 50) {
    errors.push('Category must not exceed 50 characters');
  }

  // Validate description (optional but if provided must be max 1000)
  if (description && description.length > 1000) {
    errors.push('Description must not exceed 1000 characters');
  }

  // Validate image (optional but if provided must be URL)
  if (image && typeof image !== 'string') {
    errors.push('Image must be a valid URL string');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      message: 'Validation failed',
      errors,
    });
  }

  // Sanitize inputs
  req.body.name = xss(name.trim());
  req.body.category = xss(category.trim());
  if (description) req.body.description = xss(description);

  next();
};

/**
 * Validate update food request
 */
exports.validateUpdateFood = (req, res, next) => {
  const { name, price, category, description, image } = req.body;
  
  const errors = [];

  // All fields are optional for update, but if provided must be valid

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2) {
      errors.push('Food name must be at least 2 characters');
    } else if (name.length > 100) {
      errors.push('Food name must not exceed 100 characters');
    }
  }

  if (price !== undefined) {
    if (typeof price !== 'number' || price < 0) {
      errors.push('Price must be a positive number');
    } else if (price > 10000000) {
      errors.push('Price is too high');
    }
  }

  if (category !== undefined) {
    if (typeof category !== 'string' || category.trim().length < 2) {
      errors.push('Category must be at least 2 characters');
    } else if (category.length > 50) {
      errors.push('Category must not exceed 50 characters');
    }
  }

  if (description !== undefined && description.length > 1000) {
    errors.push('Description must not exceed 1000 characters');
  }

  if (image !== undefined && typeof image !== 'string') {
    errors.push('Image must be a valid URL string');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      message: 'Validation failed',
      errors,
    });
  }

  // Sanitize inputs
  if (name) req.body.name = xss(name.trim());
  if (category) req.body.category = xss(category.trim());
  if (description) req.body.description = xss(description);

  next();
};

/**
 * Validate add review request
 */
exports.validateAddReview = (req, res, next) => {
  const { rating, comment } = req.body;
  
  const errors = [];

  // Validate rating
  if (rating === undefined || typeof rating !== 'number') {
    errors.push('Rating is required and must be a number');
  } else if (rating < 1 || rating > 5) {
    errors.push('Rating must be between 1 and 5');
  }

  // Validate comment
  if (!comment || typeof comment !== 'string') {
    errors.push('Comment is required');
  } else if (comment.trim().length < 5) {
    errors.push('Comment must be at least 5 characters');
  } else if (comment.length > 500) {
    errors.push('Comment must not exceed 500 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      message: 'Validation failed',
      errors,
    });
  }

  // Sanitize
  req.body.comment = xss(comment.trim());

  next();
};

/**
 * Validate food ID parameter
 */
exports.validateFoodId = (req, res, next) => {
  const { id } = req.params;
  
  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    return res.status(400).json({
      message: 'Invalid food ID format',
      errors: ['Food ID must be a valid MongoDB ObjectId']
    });
  }

  next();
};
