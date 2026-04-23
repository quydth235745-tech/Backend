const express = require('express');
const router = express.Router();
const auth = require('../middlewares/XacThuc');
const authorize = require('../middlewares/PhanQuyen');
const Coupon = require('../models/KhuyenMai');
const orderService = require('../services/DichVuDonHang');

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
 * POST /api/coupons/validate
 * Validate coupon for current user and order value
 */
router.post('/validate', auth, async (req, res) => {
  try {
    const { code, orderValue } = req.body;
    const result = await orderService.validateCoupon({
      code,
      orderValue,
      userId: req.user._id
    });

    res.json({
      success: true,
      data: {
        code: result.code,
        discountAmount: result.discountAmount,
        orderValue: result.orderValue,
        finalOrderValue: result.finalOrderValue
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Không áp dụng được mã khuyến mãi'
    });
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
    const {
      ma_voucher,
      loai_giam,
      gia_tri,
      don_toi_thieu,
      ngay_het_han,
      code,
      type,
      value,
      expiryDate,
      minOrderValue,
      maxUses
    } = req.body;

    const couponCode = (ma_voucher || code || '').trim();
    const discountType = (loai_giam || type || 'PhanTram').toString();
    const discountValue = Number(gia_tri ?? value);
    const minimumOrderValue = Number(don_toi_thieu ?? minOrderValue ?? 0);
    const expiresAt = ngay_het_han || expiryDate;
    const allowedUses = Number(maxUses ?? 1);

    // Validation
    if (!couponCode || !discountType || Number.isNaN(discountValue) || !expiresAt) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Map from frontend naming to DB naming
    const coupon = new Coupon({
      code: couponCode,
      discountType: ['PhanTram', 'percentage', 'percent'].includes(discountType) ? 'percent' : 'fixed',
      discountValue,
      minOrderValue: minimumOrderValue,
      maxUses: allowedUses > 0 ? allowedUses : 1,
      expiresAt: new Date(expiresAt),
      isActive: true,
      validFrom: new Date()
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
    const {
      ma_voucher,
      loai_giam,
      gia_tri,
      don_toi_thieu,
      ngay_het_han,
      code,
      type,
      value,
      expiryDate,
      minOrderValue,
      maxUses
    } = req.body;

    const updateData = {};
    if (ma_voucher || code) updateData.code = (ma_voucher || code).trim();
    if (loai_giam || type) updateData.discountType = ['PhanTram', 'percentage', 'percent'].includes((loai_giam || type).toString()) ? 'percent' : 'fixed';
    if (gia_tri !== undefined || value !== undefined) updateData.discountValue = Number(gia_tri ?? value);
    if (don_toi_thieu !== undefined || minOrderValue !== undefined) updateData.minOrderValue = Number(don_toi_thieu ?? minOrderValue ?? 0);
    if (maxUses !== undefined) updateData.maxUses = Number(maxUses);
    if (ngay_het_han || expiryDate) updateData.expiresAt = new Date(ngay_het_han || expiryDate);

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
