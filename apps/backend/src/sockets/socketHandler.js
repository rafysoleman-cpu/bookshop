import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getRedisClient } from '../config/redis.js';
import { envConfig } from '../config/env.js';

let io;

export const initializeSocket = (server) => {
  console.log('🔌 Initializing Socket.IO server...');
  
  io = new Server(server, {
    cors: {
      origin: envConfig.allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'], // Allow fallback to polling
    pingTimeout: 120000, // Increased to 2 minutes to prevent premature disconnections
    pingInterval: 15000, // Send heartbeats more frequently (every 15 seconds)
    upgradeTimeout: 10000, // Time to wait for transport upgrade
    maxHttpBufferSize: 1e6 // 1MB
  });

  console.log('🔗 Socket.IO server created with CORS:', envConfig.allowedOrigins);

  // Debug middleware - log connections briefly
  io.use((socket, next) => {
    console.log(`🔍 Socket connection from: ${socket.handshake.headers.origin}`);
    next();
  });

  // Temporarily disable auth for debugging
  // TODO: Re-enable after fixing connection issues
  /*
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user || !user.isActive) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });
  */

  io.on('connection', (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);
    
    // Join user to their personal room (temporarily use socket ID)
    const userId = socket.handshake.auth.userId || socket.id;
    socket.join(`user:${userId}`);
    console.log(`🏠 Socket ${socket.id} joined room: user:${userId}`);

    // Handle stock updates
    socket.on('subscribe:product', (productId) => {
      console.log(`📦 Socket ${socket.id} subscribing to product: ${productId}`);
      socket.join(`product:${productId}`);
    });

    socket.on('unsubscribe:product', (productId) => {
      console.log(`📦 Socket ${socket.id} unsubscribing from product: ${productId}`);
      socket.leave(`product:${productId}`);
    });

    // Handle order updates
    socket.on('subscribe:order', (orderId) => {
      console.log(`📋 Socket ${socket.id} subscribing to order: ${orderId}`);
      socket.join(`order:${orderId}`);
    });

    socket.on('unsubscribe:order', (orderId) => {
      console.log(`📋 Socket ${socket.id} unsubscribing from order: ${orderId}`);
      socket.leave(`order:${orderId}`);
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`❌ Socket ${socket.id} disconnected. Reason: ${reason}`);
    });

    // Handle connection errors
    socket.on('connect_error', (error) => {
      console.error(`❌ Socket ${socket.id} connection error:`, error);
    });
  });

  // Global error handling
  io.on('error', (error) => {
    console.error('❌ Socket.IO server error:', error);
  });

  return io;
};

// Helper functions to emit events
export const emitStockUpdate = (productId, stockData) => {
  if (io) {
    io.to(`product:${productId}`).emit('stock:update', {
      productId,
      ...stockData,
      timestamp: new Date().toISOString()
    });
  }
};

export const emitOrderUpdate = (orderId, orderData) => {
  if (io) {
    io.to(`order:${orderId}`).emit('order:update', {
      orderId,
      ...orderData,
      timestamp: new Date().toISOString()
    });
  }
};

export const emitUserNotification = (userId, notification) => {
  if (io) {
    io.to(`user:${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }
};

export const emitAdminNotification = (notification) => {
  if (io) {
    io.to('admin').emit('notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }
};

export const emitFlashSaleUpdate = (flashSaleData) => {
  if (io) {
    io.emit('flashsale:update', {
      ...flashSaleData,
      timestamp: new Date().toISOString()
    });
  }
};

export const emitNewOrder = (orderData) => {
  if (io) {
    // Notify admin
    io.to('admin').emit('new:order', {
      ...orderData,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Tell every connected client that the shared catalog changed.
 *
 * This is a broadcast rather than a room emit on purpose: `emitProductUpdate`
 * targets `product:<id>`, which only reaches clients that emitted
 * `subscribe:product` — nothing in the storefront does that. A new product, a
 * renamed category or a price edit is not scoped to one product room, it changes
 * the list every shopper is looking at, so it goes to everyone.
 *
 * The payload is deliberately just a reason plus identifiers: it is a "your
 * cached copy is stale, refetch" signal and carries no catalogue data. That is
 * also why this needs no socket auth — the listeners only refetch public
 * endpoints that enforce their own access rules.
 */
export const emitCatalogUpdate = (reason, meta = {}) => {
  if (io) {
    io.emit('catalog:update', {
      reason,
      ...meta,
      timestamp: new Date().toISOString()
    });
  }
};

export const emitProductUpdate = (productId, productData) => {
  if (io) {
    io.to(`product:${productId}`).emit('product:update', {
      productId,
      ...productData,
      timestamp: new Date().toISOString()
    });
  }
};

export const emitSystemNotification = (notification) => {
  if (io) {
    io.emit('system:notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }
};

// Upload progress helper
export const emitUploadProgress = (userId, progressData) => {
  if (io) {
    io.to(`user:${userId}`).emit('upload:progress', {
      ...progressData,
      timestamp: new Date().toISOString()
    });
  }
};
