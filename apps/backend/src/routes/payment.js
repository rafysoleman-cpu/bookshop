import express from 'express';
import Order from '../models/Order.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// @desc    Confirm the payment method for an order
// @route   POST /api/v1/payments/initiate
// @access  Private
router.post('/initiate', async (req, res, next) => {
  try {
    const { orderId, paymentMethod } = req.body;

    const order = await Order.findOne({ _id: orderId, user: req.user._id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    if (order.paymentStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Order already paid or payment processed'
      });
    }

    if (paymentMethod && paymentMethod !== 'cash_on_delivery') {
      return res.status(400).json({
        success: false,
        error: 'Online payment is not configured. Please use cash on delivery.'
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Order placed successfully. Payment is due on delivery.',
        order
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get payment status
// @route   GET /api/v1/payments/status/:orderId
// @access  Private
router.get('/status/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ _id: orderId, user: req.user._id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        status: order.status,
        total: order.total,
        transactionId: order.transactionId
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
