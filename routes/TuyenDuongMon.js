const express = require('express');
const router = express.Router();
const auth = require('../middlewares/XacThuc');
const authorize = require('../middlewares/PhanQuyen');
const multer = require('multer');
const { 
  validateCreateFood, 
  validateUpdateFood, 
  validateAddReview,
  validateFoodId 
} = require('../validators/KiemTraMon');
const foodController = require('../controllers/ControllerMon');

const upload = multer({ storage: multer.memoryStorage() });

/**
 * GET /api/foods/stats/dashboard
 * Get food statistics
 * NOTE: Must be BEFORE :id route to avoid conflict
 */
router.get('/stats/dashboard',
  auth,
  authorize('admin', 'manager'),
  foodController.getFoodStats
);

/**
 * GET /api/foods/search
 * Search foods
 * NOTE: Must be BEFORE :id route
 */
router.get('/search',
  foodController.searchFoods
);

/**
 * GET /api/foods/category/:category
 * Get foods by category
 * NOTE: Must be BEFORE :id route
 */
router.get('/category/:category',
  foodController.getFoodsByCategory
);

/**
 * POST /api/foods/upload
 * Upload image to Cloudinary
 * NOTE: Must be BEFORE generic POST / route
 */
router.post('/upload',
  auth,
  authorize('admin'),
  upload.single('image'),
  foodController.uploadImage
);

/**
 * GET /api/foods
 * Get all foods with pagination
 */
router.get('/',
  foodController.getFoods
);

/**
 * POST /api/foods
 * Create new food
 */
router.post('/',
  auth,
  authorize('admin'),
  validateCreateFood,
  foodController.createFood
);

/**
 * GET /api/foods/:id
 * Get single food
 */
router.get('/:id',
  validateFoodId,
  foodController.getFoodById
);

/**
 * PUT /api/foods/:id
 * Update food
 */
router.put('/:id',
  auth,
  authorize('admin'),
  validateFoodId,
  validateUpdateFood,
  foodController.updateFood
);

/**
 * DELETE /api/foods/:id
 * Delete food
 */
router.delete('/:id',
  auth,
  authorize('admin'),
  validateFoodId,
  foodController.deleteFood
);

/**
 * POST /api/foods/:id/reviews
 * Add review to food
 */
router.post('/:id/reviews',
  auth,
  validateFoodId,
  validateAddReview,
  foodController.addReview
);

module.exports = router;