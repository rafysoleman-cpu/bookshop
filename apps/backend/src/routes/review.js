import express from 'express';
import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { protect, authorize } from '../middlewares/auth.js';
import { validate, createReviewSchema } from '../utils/validation.js';
import { deleteCachePattern } from '../config/redis.js';

const router = express.Router();

// @desc    Get product reviews
// @route   GET /api/v1/reviews/product/:productId
// @access  Public
router.get('/product/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { rating, sortBy = 'newest' } = req.query;

    // Build query
    const query = { 
      product: productId,
      status: 'approved'
    };

    if (rating) {
      query.rating = parseFloat(rating);
    }

    // Sorting
    let sort = {};
    switch (sortBy) {
      case 'rating-high':
        sort = { rating: -1 };
        break;
      case 'rating-low':
        sort = { rating: 1 };
        break;
      case 'helpful':
        sort = { helpful: -1 };
        break;
      case 'newest':
      default:
        sort = { createdAt: -1 };
        break;
    }

    const reviews = await Review.find(query)
      .populate('user', 'name avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments(query);

    // Get rating distribution
    const ratingDistribution = await Review.aggregate([
      {
        $match: {
          product: new mongoose.Types.ObjectId(productId),
          status: 'approved'
        }
      },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: -1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        ratingDistribution
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create review
// @route   POST /api/v1/reviews
// @access  Private
router.post('/', protect, validate(createReviewSchema), async (req, res, next) => {
  try {
    const { product, order, rating, title, content, images } = req.body;

    // Check if order exists and belongs to user
    const orderDoc = await Order.findOne({ _id: order, user: req.user._id });
    if (!orderDoc) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if order is delivered
    if (orderDoc.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        error: 'Can only review delivered orders'
      });
    }

    // Check if product is in the order
    const productInOrder = orderDoc.items.some(item => 
      item.product.toString() === product.toString()
    );
    if (!productInOrder) {
      return res.status(400).json({
        success: false,
        error: 'Product not found in order'
      });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      user: req.user._id,
      product
    });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        error: 'You have already reviewed this product'
      });
    }

    // Create review
    const review = await Review.create({
      user: req.user._id,
      product,
      order,
      rating,
      title,
      content,
      images,
      verified: true,
      status: 'approved' // Auto-approve for verified purchases
    });

    // Update product ratings
    const productDoc = await Product.findById(product);
    await productDoc.updateRatings();

    // Clear cache
    await deleteCachePattern('products:*');
    await deleteCachePattern(`product:${product}`);

    res.status(201).json({
      success: true,
      data: review
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update review
// @route   PUT /api/v1/reviews/:id
// @access  Private
router.put('/:id', protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, title, content, images } = req.body;

    let review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    // Check ownership
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this review'
      });
    }

    // Update review
    review.rating = rating || review.rating;
    review.title = title || review.title;
    review.content = content || review.content;
    review.images = images || review.images;
    await review.save();

    // Update product ratings
    const product = await Product.findById(review.product);
    await product.updateRatings();

    // Clear cache
    await deleteCachePattern('products:*');
    await deleteCachePattern(`product:${review.product}`);

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete review
// @route   DELETE /api/v1/reviews/:id
// @access  Private
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    // Check ownership
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this review'
      });
    }

    const productId = review.product;
    await review.remove();

    // Update product ratings
    const product = await Product.findById(productId);
    await product.updateRatings();

    // Clear cache
    await deleteCachePattern('products:*');
    await deleteCachePattern(`product:${productId}`);

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Mark review as helpful
// @route   POST /api/v1/reviews/:id/helpful
// @access  Public
router.post('/:id/helpful', async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    review.helpful += 1;
    await review.save();

    res.json({
      success: true,
      data: {
        helpful: review.helpful
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user reviews
// @route   GET /api/v1/reviews/user
// @access  Private
router.get('/user', protect, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ user: req.user._id })
      .populate('product', 'name images')
      .populate('order', 'orderNumber createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ user: req.user._id });

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Admin routes
// @desc    Get all reviews (Admin)
// @route   GET /api/v1/reviews/admin/all
// @access  Private (Admin)
router.get('/admin/all', protect, authorize('admin'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { status, rating, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (rating) query.rating = parseFloat(rating);
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const reviews = await Review.find(query)
      .populate('user', 'name email')
      .populate('product', 'name')
      .populate('order', 'orderNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments(query);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Approve/Reject review (Admin)
// @route   PUT /api/v1/reviews/:id/status
// @access  Private (Admin)
router.put('/:id/status', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, response } = req.body;

    let review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    review.status = status;
    
    if (response) {
      review.response = {
        content: response.content,
        respondedBy: req.user._id,
        respondedAt: new Date()
      };
    }

    await review.save();

    // Update product ratings if status changed
    if (status === 'approved' || status === 'rejected') {
      const product = await Product.findById(review.product);
      await product.updateRatings();
    }

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    next(error);
  }
});

export default router;
