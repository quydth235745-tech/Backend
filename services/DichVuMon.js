/**
 * Food Service
 * Handles all food-related business logic
 */

const Food = require('../models/MonAn');

/**
 * Get all foods with pagination
 * @param {Number} page - Page number (default 1)
 * @param {Number} limit - Items per page (default 10)
 * @param {Object} filters - Additional filters
 * @returns {Promise<Object>} Foods and pagination info
 */
exports.getFoods = async (page = 1, limit = 10, filters = {}) => {
  const skip = (page - 1) * limit;

  const foods = await Food.find(filters)
    .limit(limit)
    .skip(skip)
    .sort({ createdAt: -1 });

  const total = await Food.countDocuments(filters);
  const totalPages = Math.ceil(total / limit);

  return {
    data: foods,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
};

/**
 * Get single food by ID
 * @param {String} foodId - Food ID
 * @returns {Promise<Object>} Food document
 * @throws Error if not found
 */
exports.getFoodById = async (foodId) => {
  const food = await Food.findById(foodId);
  
  if (!food) {
    throw new Error('Food not found');
  }

  return food;
};

/**
 * Create new food item
 * @param {Object} foodData - Food data
 * @returns {Promise<Object>} Created food
 */
exports.createFood = async (foodData) => {
  const { name, price, description, category, image, promotion } = foodData;

  const newFood = new Food({
    name,
    price,
    description,
    category,
    image,
    promotion: promotion || 0,
  });

  const savedFood = await newFood.save();
  return savedFood;
};

/**
 * Update food item
 * @param {String} foodId - Food ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated food
 * @throws Error if not found
 */
exports.updateFood = async (foodId, updateData) => {
  const allowedFields = ['name', 'price', 'description', 'category', 'image', 'promotion'];
  
  // Only allow specified fields
  const dataToUpdate = {};
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      dataToUpdate[field] = updateData[field];
    }
  }

  const updatedFood = await Food.findByIdAndUpdate(
    foodId,
    dataToUpdate,
    { new: true, runValidators: true }
  );

  if (!updatedFood) {
    throw new Error('Food not found');
  }

  return updatedFood;
};

/**
 * Delete food item
 * @param {String} foodId - Food ID
 * @returns {Promise<Object>} Deleted food
 * @throws Error if not found
 */
exports.deleteFood = async (foodId) => {
  const deletedFood = await Food.findByIdAndDelete(foodId);

  if (!deletedFood) {
    throw new Error('Food not found');
  }

  return deletedFood;
};

/**
 * Add or update review for food
 * @param {String} foodId - Food ID
 * @param {String} userId - User ID
 * @param {String} userName - User name
 * @param {Number} rating - Rating (1-5)
 * @param {String} comment - Review comment
 * @returns {Promise<Object>} Updated food with review
 */
exports.addReview = async (foodId, userId, userName, rating, comment) => {
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  if (!comment || comment.trim().length < 5) {
    throw new Error('Comment must be at least 5 characters');
  }

  const food = await Food.findById(foodId);
  if (!food) {
    throw new Error('Food not found');
  }

  // Find existing review by user
  const existingReview = food.reviews.find(
    review => review.userId.toString() === userId.toString()
  );

  if (existingReview) {
    // Update existing review
    existingReview.rating = rating;
    existingReview.comment = comment;
    existingReview.createdAt = new Date();
  } else {
    // Add new review
    food.reviews.push({
      userId,
      userName,
      rating,
      comment,
    });
  }

  const updatedFood = await food.save();
  return updatedFood;
};

/**
 * Search foods by name or category
 * @param {String} query - Search query
 * @param {Number} page - Page number
 * @param {Number} limit - Items per page
 * @returns {Promise<Object>} Matching foods and pagination
 */
exports.searchFoods = async (query, page = 1, limit = 10) => {
  const searchFilter = {
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { category: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
    ]
  };

  return this.getFoods(page, limit, searchFilter);
};

/**
 * Get foods by category
 * @param {String} category - Category name
 * @param {Number} page - Page number
 * @param {Number} limit - Items per page
 * @returns {Promise<Object>} Foods in category and pagination
 */
exports.getFoodsByCategory = async (category, page = 1, limit = 10) => {
  return this.getFoods(page, limit, { category });
};

/**
 * Get food statistics for dashboard
 * @returns {Promise<Object>} Statistics
 */
exports.getFoodStats = async () => {
  const stats = {
    totalFoods: await Food.countDocuments(),
    byCategory: await Food.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' },
        }
      }
    ]),
    highestRated: await Food.find()
      .sort({ 'reviews.rating': -1 })
      .limit(5),
  };

  return stats;
};
