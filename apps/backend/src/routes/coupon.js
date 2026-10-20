import express from 'express';
import Coupon from '../models/Coupon.js';
import { protect, optionalAuth } from '../middlewares/auth.js';
import { deleteCachePattern } from '../config/redis.js';

const router = express.Router();

// @desc    Get all active coupons
// @route   GET /api/v1/coupons
// @access  Public
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const coupons = await Coupon.find({
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    })
      .sort({ endDate: 1 });

    res.json({
      success: true,
      data: coupons
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Validate coupon
// @route   POST /api/v1/coupons/validate
// @access  Public/Private
router.post('/validate', optionalAuth, async (req, res, next) => {
  try {
    const { code, subtotal } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Coupon code is required'
      });
    }

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: 'Invalid coupon code'
      });
    }

    // Check if coupon is valid
    if (!coupon.isValid()) {
      return res.status(400).json({
        success: false,
        error: 'Coupon is expired or inactive'
      });
    }

    // Check minimum amount
    if (subtotal < coupon.minimumAmount) {
      return res.status(400).json({
        success: false,
        error: `Minimum amount of ${coupon.minimumAmount} required`
      });
    }

    // Check user usage limit if user is authenticated
    if (req.user) {
      const canUse = await coupon.canUserUse(req.user._id);
      if (!canUse) {
        return res.status(400).json({
          success: false,
          error: 'Coupon usage limit exceeded'
        });
      }
    }

    // Calculate discount
    const discount = coupon.calculateDiscount(subtotal);

    res.json({
      success: true,
      data: {
        coupon: {
          code: coupon.code,
          name: coupon.name,
          type: coupon.type,
          value: coupon.value,
          minimumAmount: coupon.minimumAmount,
          maximumDiscount: coupon.maximumDiscount
        },
        discount,
        subtotal,
        total: subtotal - discount
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get coupon by code
// @route   GET /api/v1/coupons/:code
// @access  Public
router.get('/:code', async (req, res, next) => {
  try {
    const { code } = req.params;

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: 'Coupon not found'
      });
    }

    res.json({
      success: true,
      data: coupon
    });
  } catch (error) {
    next(error);
  }
});

export default router;
