import express from 'express';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { protect, optionalAuth } from '../middlewares/auth.js';
import { getCache, setCache, deleteCache } from '../config/redis.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Helper function to get or create cart
const getOrCreateCart = async (user, sessionId) => {
  let cart;
  
  if (user) {
    cart = await Cart.findOne({ user }).populate('items.product');
    if (!cart) {
      cart = await Cart.create({
        user: user._id,
        sessionId: uuidv4()
      });
    }
  } else {
    cart = await Cart.findOne({ sessionId }).populate('items.product');
    if (!cart) {
      cart = await Cart.create({
        sessionId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });
    }
  }
  
  return cart;
};

// @desc    Get cart
// @route   GET /api/v1/cart
// @access  Public/Private
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.sessionID;
    const cart = await getOrCreateCart(req.user, sessionId);
    
    const subtotal = cart.calculateSubtotal();
    
    res.json({
      success: true,
      data: {
        items: cart.items,
        subtotal,
        itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Add item to cart
// @route   POST /api/v1/cart/add
// @access  Public/Private
router.post('/add', optionalAuth, async (req, res, next) => {
  try {
    const { productId, quantity = 1, variant } = req.body;
    const sessionId = req.headers['x-session-id'] || req.sessionID;
    
    // Validate product
    const product = await Product.findById(productId);
    if (!product || product.status !== 'active') {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    // Check inventory
    const availableQuantity = variant ? 
      product.variants.find(v => v.name === variant.name && v.option === variant.option)?.inventory || 0 :
      product.inventory.quantity;
    
    if (availableQuantity < quantity) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient stock'
      });
    }
    
    const cart = await getOrCreateCart(req.user, sessionId);
    await cart.addItem(product, quantity, variant);
    
    // Clear cache
    await deleteCache(`cart:${req.user?._id || sessionId}`);
    
    const subtotal = cart.calculateSubtotal();
    
    res.json({
      success: true,
      data: {
        items: cart.items,
        subtotal,
        itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update cart item quantity
// @route   PUT /api/v1/cart/update
// @access  Public/Private
router.put('/update', optionalAuth, async (req, res, next) => {
  try {
    const { productId, quantity, variant } = req.body;
    const sessionId = req.headers['x-session-id'] || req.sessionID;
    
    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be at least 1'
      });
    }
    
    const cart = await getOrCreateCart(req.user, sessionId);
    await cart.updateItemQuantity(productId, quantity, variant);
    
    // Clear cache
    await deleteCache(`cart:${req.user?._id || sessionId}`);
    
    const subtotal = cart.calculateSubtotal();
    
    res.json({
      success: true,
      data: {
        items: cart.items,
        subtotal,
        itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Remove item from cart
// @route   DELETE /api/v1/cart/remove
// @access  Public/Private
router.delete('/remove', optionalAuth, async (req, res, next) => {
  try {
    const { productId, variant } = req.body;
    const sessionId = req.headers['x-session-id'] || req.sessionID;
    
    const cart = await getOrCreateCart(req.user, sessionId);
    await cart.removeItem(productId, variant);
    
    // Clear cache
    await deleteCache(`cart:${req.user?._id || sessionId}`);
    
    const subtotal = cart.calculateSubtotal();
    
    res.json({
      success: true,
      data: {
        items: cart.items,
        subtotal,
        itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Clear cart
// @route   DELETE /api/v1/cart/clear
// @access  Public/Private
router.delete('/clear', optionalAuth, async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.sessionID;
    
    const cart = await getOrCreateCart(req.user, sessionId);
    await cart.clearCart();
    
    // Clear cache
    await deleteCache(`cart:${req.user?._id || sessionId}`);
    
    res.json({
      success: true,
      data: {
        items: [],
        subtotal: 0,
        itemCount: 0
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Merge guest cart with user cart
// @route   POST /api/v1/cart/merge
// @access  Private
router.post('/merge', protect, async (req, res, next) => {
  try {
    const { guestSessionId } = req.body;
    
    if (!guestSessionId) {
      return res.status(400).json({
        success: false,
        error: 'Guest session ID required'
      });
    }
    
    const userCart = await getOrCreateCart(req.user, null);
    const guestCart = await Cart.findOne({ sessionId: guestSessionId });
    
    if (guestCart && guestCart.items.length > 0) {
      await userCart.mergeWithGuestCart(guestCart);
      await Cart.findByIdAndDelete(guestCart._id);
    }
    
    // Clear cache
    await deleteCache(`cart:${req.user._id}`);
    await deleteCache(`cart:${guestSessionId}`);
    
    const subtotal = userCart.calculateSubtotal();
    
    res.json({
      success: true,
      data: {
        items: userCart.items,
        subtotal,
        itemCount: userCart.items.reduce((sum, item) => sum + item.quantity, 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
