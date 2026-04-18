/**
 * Food Controller
 * Handles request/response, delegates business logic to services
 */

const foodService = require('../services/DichVuMon');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * GET /api/foods
 * Get all foods with pagination
 */
exports.getFoods = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await foodService.getFoods(page, limit);

    res.json({
      message: 'Foods retrieved successfully',
      ...result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/foods/search
 * Search foods by query
 */
exports.searchFoods = async (req, res, next) => {
  try {
    const { q: query } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: ['Search query must be at least 2 characters']
      });
    }

    const result = await foodService.searchFoods(query, page, limit);

    res.json({
      message: 'Search results',
      query,
      ...result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/foods/category/:category
 * Get foods by category
 */
exports.getFoodsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await foodService.getFoodsByCategory(category, page, limit);

    res.json({
      message: 'Foods retrieved successfully',
      category,
      ...result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/foods/:id
 * Get single food by ID
 */
exports.getFoodById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const food = await foodService.getFoodById(id);

    res.json({
      message: 'Food retrieved successfully',
      data: food
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/foods
 * Create new food (admin only)
 */
exports.createFood = async (req, res, next) => {
  try {
    const food = await foodService.createFood(req.body);

    res.status(201).json({
      message: 'Food created successfully',
      data: food
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/foods/:id
 * Update food (admin only)
 */
exports.updateFood = async (req, res, next) => {
  try {
    const { id } = req.params;

    const updatedFood = await foodService.updateFood(id, req.body);

    res.json({
      message: 'Food updated successfully',
      data: updatedFood
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/foods/:id
 * Delete food (admin only)
 */
exports.deleteFood = async (req, res, next) => {
  try {
    const { id } = req.params;

    await foodService.deleteFood(id);

    res.json({
      message: 'Food deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/foods/:id/reviews
 * Add review to food
 */
exports.addReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;
    const userName = req.user.name;

    const food = await foodService.addReview(id, userId, userName, rating, comment);

    res.status(201).json({
      message: 'Review added successfully',
      data: food
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/foods/upload
 * Upload image to Cloudinary (admin only)
 */
exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: ['No image file provided']
      });
    }

    const uploadFromBuffer = (buffer) => new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'food-menu' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      streamifier.createReadStream(buffer).pipe(stream);
    });

    const result = await uploadFromBuffer(req.file.buffer);

    res.json({
      message: 'Image uploaded successfully',
      data: {
        imageUrl: result.secure_url,
        publicId: result.public_id
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/foods/stats/dashboard
 * Get food statistics (admin only)
 */
exports.getFoodStats = async (req, res, next) => {
  try {
    const stats = await foodService.getFoodStats();

    res.json({
      message: 'Food statistics retrieved successfully',
      data: stats
    });
  } catch (err) {
    next(err);
  }
};
