const express = require('express');
const router = express.Router();
const auth = require('../middlewares/XacThuc');
const authorize = require('../middlewares/PhanQuyen');
const Coupon = require('../models/KhuyenMai');

/**
 * GET /api/coupons
 * Get all coupons (admin only)
 */
router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, data: coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/coupons/:id
 * Get single coupon by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.json({ success: true, data: coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/coupons
 * Create new coupon
 */
router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { ma_voucher, loai_giam, gia_tri, don_toi_thieu, ngay_het_han } = req.body;

    // Validation
    if (!ma_voucher || !loai_giam || !gia_tri || !ngay_het_han) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Map from frontend naming to DB naming
    const coupon = new Coupon({
      code: ma_voucher,
      discountType: loai_giam === 'PhanTram' ? 'percent' : 'fixed',
      discountValue: gia_tri,
      minOrderValue: don_toi_thieu || 0,
      expiresAt: new Date(ngay_het_han),
      isActive: true
    });

    await coupon.save();
    res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/coupons/:id
 * Update coupon
 */
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { ma_voucher, loai_giam, gia_tri, don_toi_thieu, ngay_het_han } = req.body;

    const updateData = {};
    if (ma_voucher) updateData.code = ma_voucher;
    if (loai_giam) updateData.discountType = loai_giam === 'PhanTram' ? 'percent' : 'fixed';
    if (gia_tri) updateData.discountValue = gia_tri;
    if (don_toi_thieu !== undefined) updateData.minOrderValue = don_toi_thieu;
    if (ngay_het_han) updateData.expiresAt = new Date(ngay_het_han);

    const coupon = await Coupon.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });

    res.json({ success: true, data: coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/coupons/:id
 * Delete coupon
 */
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });

    res.json({ success: true, message: 'Coupon deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
