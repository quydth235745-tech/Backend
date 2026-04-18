const express = require('express');
const router = express.Router();
const auth = require('../middlewares/XacThuc');
const authorize = require('../middlewares/PhanQuyen');

// Simulated comment storage (Trong production dùng DB model)
let comments = [];
let commentId = 1;

/**
 * GET /api/comments
 * Get all comments (admin only)
 */
router.get('/', auth, authorize('admin'), (req, res) => {
  try {
    res.json({ success: true, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/comments/food/:foodId
 * Get comments for specific food
 */
router.get('/food/:foodId', async (req, res) => {
  try {
    const foodComments = comments.filter(c => c.food_id === parseInt(req.params.foodId) && c.trang_thai === 1);
    res.json({ success: true, data: foodComments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/comments
 * Create new comment
 */
router.post('/', auth, async (req, res) => {
  try {
    const { food_id, mon_an, content, rating } = req.body;

    if (!content || !rating) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newComment = {
      id: commentId++,
      customer_name: req.user?.name || req.user?.username,
      phone: req.user?.phone,
      food_name: mon_an,
      food_id: food_id,
      content: content,
      rating: rating,
      trang_thai: 0, // Pending approval
      createdAt: new Date(),
      ngay_tao: new Date()
    };

    comments.push(newComment);
    res.status(201).json({ success: true, data: newComment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/comments/:id
 * Update comment status (admin only)
 */
router.put('/:id', auth, authorize('admin'), (req, res) => {
  try {
    const { trang_thai } = req.body;
    const commentIndex = comments.findIndex(c => c.id === parseInt(req.params.id));

    if (commentIndex === -1) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    comments[commentIndex].trang_thai = trang_thai;
    res.json({ success: true, data: comments[commentIndex] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/comments/:id
 * Delete comment (admin only)
 */
router.delete('/:id', auth, authorize('admin'), (req, res) => {
  try {
    comments = comments.filter(c => c.id !== parseInt(req.params.id));
    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
