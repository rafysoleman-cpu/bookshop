import express from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';
import Coupon from '../models/Coupon.js';
import { protect, authorize } from '../middlewares/auth.js';
import { validate, createOrderSchema } from '../utils/validation.js';
import { deleteCachePattern } from '../config/redis.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// @desc    Create order
// @route   POST /api/v1/orders
// @access  Private
router.post('/', validate(createOrderSchema), async (req, res, next) => {
  try {
    const { items, paymentMethod, shippingAddress, billingAddress, couponCode, notes } = req.body;
    
    // Validate products and calculate totals
    let subtotal = 0;
    const orderItems = [];
    
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || product.status !== 'active') {
        return res.status(404).json({
          success: false,
          error: `Product ${item.product} not found`
        });
      }
      
      // Check inventory
      const availableQuantity = item.variant ? 
        product.variants.find(v => v.name === item.variant.name && v.option === item.variant.option)?.inventory || 0 :
        product.inventory.quantity;
      
      if (availableQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for product ${product.name}`
        });
      }
      
      const price = item.variant ? item.variant.price : product.price;
      const total = price * item.quantity;
      
      orderItems.push({
        product: product._id,
        variant: item.variant,
        quantity: item.quantity,
        price,
        total
      });
      
      subtotal += total;
    }
    
    // Calculate tax and shipping
    const tax = subtotal * 0.15; // 15% tax
    const shipping = subtotal >= 50 ? 0 : 10; // Free shipping over $50
    
    // Apply coupon if provided
    let discount = 0;
    let coupon = null;
    
    if (couponCode) {
      coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
      
      if (!coupon || !coupon.isValid()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired coupon'
        });
      }
      
      const canUse = await coupon.canUserUse(req.user._id);
      if (!canUse) {
        return res.status(400).json({
          success: false,
          error: 'Coupon usage limit exceeded'
        });
      }
      
      discount = coupon.calculateDiscount(subtotal);
    }
    
    const total = subtotal + tax + shipping - discount;
    
    // Create order
    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      paymentMethod,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      subtotal,
      tax,
      shipping,
      discount,
      coupon: coupon ? {
        code: coupon.code,
        discount,
        type: coupon.type
      } : undefined,
      total,
      notes
    });
    
    // Update inventory
    for (const item of items) {
      const product = await Product.findById(item.product);
      
      if (item.variant) {
        const variant = product.variants.find(v => v.name === item.variant.name && v.option === item.variant.option);
        if (variant) {
          variant.inventory -= item.quantity;
        }
      } else {
        product.inventory.quantity -= item.quantity;
      }
      
      await product.save({ validateBeforeSave: false });
    }
    
    // Update coupon usage
    if (coupon) {
      await coupon.incrementUsage();
    }
    
    // Clear user's cart
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      await cart.clearCart();
    }
    
    // Clear caches
    await deleteCachePattern('cart:*');
    await deleteCachePattern('products:*');
    
    // Populate order details for response
    await order.populate([
      { path: 'items.product', select: 'name sku images' },
      { path: 'user', select: 'name email' }
    ]);
    
    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user orders
// @route   GET /api/v1/orders
// @access  Private
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const status = req.query.status;
    const query = { user: req.user._id };
    
    if (status) {
      query.status = status;
    }
    
    const orders = await Order.find(query)
      .populate('items.product', 'name sku images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Order.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        orders,
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

// @desc    Get single order
// @route   GET /api/v1/orders/:id
// @access  Private
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const order = await Order.findOne({ _id: id, user: req.user._id })
      .populate('items.product', 'name sku images')
      .populate('user', 'name email');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Cancel order
// @route   PUT /api/v1/orders/:id/cancel
// @access  Private
router.put('/:id/cancel', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const order = await Order.findOne({ _id: id, user: req.user._id });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    if (!order.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        error: 'Order cannot be cancelled'
      });
    }
    
    await order.updateStatus('cancelled', reason);
    
    // Restore inventory
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      
      if (item.variant) {
        const variant = product.variants.find(v => 
          v.name === item.variant.name && v.option === item.variant.option
        );
        if (variant) {
          variant.inventory += item.quantity;
        }
      } else {
        product.inventory.quantity += item.quantity;
      }
      
      await product.save({ validateBeforeSave: false });
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
});

// Admin routes
// @desc    Get all orders (Admin)
// @route   GET /api/v1/orders/admin/all
// @access  Private (Admin)
router.get('/admin/all', protect, authorize('admin'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const query = {};
    
    const status = req.query.status;
    if (status) {
      query.status = status;
    }
    
    const orders = await Order.find(query)
      .populate('items.product', 'name sku')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Order.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        orders,
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

// @desc    Update order status (Admin)
// @route   PUT /api/v1/orders/:id/status
// @access  Private (Admin)
router.put('/:id/status', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, estimatedDelivery } = req.body;
    
    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    // Update order
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (estimatedDelivery) order.estimatedDelivery = estimatedDelivery;
    
    await order.updateStatus(status);
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
});

export default router;
