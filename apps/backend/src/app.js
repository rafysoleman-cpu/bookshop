import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get current directory

const __filename = fileURLToPath(import.meta.url);

const __dirname = dirname(__filename);

// Load .env from backend root directory (only in development)

if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: join(__dirname, "..", ".env") });
}

// Log key environment variables (simplified)
if (process.env.NODE_ENV === 'development') {
  console.log(" Environment: Development Mode");
  console.log(" Port:", envConfig.port);
}

import { createServer } from "http";

import { initializeSocket } from "./sockets/socketHandler.js";

import { connectDB } from "./config/database.js";

import { connectRedis } from "./config/redis.js";

import errorHandler from "./middlewares/errorHandler.js";

import notFound from "./middlewares/notFound.js";

import requestLogger from "./middlewares/requestLogger.js";

import { envConfig } from "./config/env.js";

// Routes

import authRoutes from "./routes/auth.js";

import userRoutes from "./routes/user.js";

import productRoutes from "./routes/product.js";

import categoryRoutes from "./routes/category.js";

import cartRoutes from "./routes/cart.js";

import orderRoutes from "./routes/order.js";

import paymentRoutes from "./routes/payment.js";

import adminRoutes from "./routes/admin.js";

import searchRoutes from "./routes/search.js";

import couponRoutes from "./routes/coupon.js";

import reviewRoutes from "./routes/review.js";

import blogRoutes from "./routes/blog.js";

import contactRoutes from "./routes/contact.js";

import uploadRoutes from "./routes/uploadRoutes.js";

console.log("Starting server...");

const app = express();

// 🔥 TRUST PROXY FOR RAILWAY

app.set("trust proxy", 1);

// 🔥 MUST BE FIRST MIDDLEWARE - CORS Configuration
const corsOptions = {
  origin: envConfig.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Security middleware (AFTER CORS)

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);

app.use(mongoSanitize());

// API Request Logger (for debugging)
app.use(requestLogger);

// Rate limiting

const limiter = rateLimit({
  windowMs: envConfig.rateLimit.windowMs,
  max: envConfig.rateLimit.maxRequests,
  message: "Too many requests from this IP, please try again later.",
  trustProxy: true, // Now works with app.set('trust proxy', 1)
  skip: (req) => {
    // Skip rate limiting for health checks and Google OAuth
    return req.url === "/health" || req.url.includes("/auth/google");
  },
});

app.use("/api", limiter);

// Body parser middleware (moved before routes to parse JSON request bodies)
// Increase timeout for large file uploads
app.use(express.json({ limit: "10mb" }));

app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Increase server timeout for large uploads
app.use((req, res, next) => {
  res.setTimeout(300000, () => { // 5 minutes timeout
    console.log('⏰ Request timeout:', req.url);
  });
  next();
});

// API Routes

app.use("/api/v1/auth", authRoutes);

app.use("/api/v1/users", userRoutes);

app.use("/api/v1/products", productRoutes);

app.use("/api/v1/categories", categoryRoutes);

app.use("/api/v1/cart", cartRoutes);

app.use("/api/v1/orders", orderRoutes);

app.use("/api/v1/payments", paymentRoutes);

app.use("/api/v1/admin", adminRoutes);

app.use("/api/v1/search", searchRoutes);

app.use("/api/v1/coupons", couponRoutes);

app.use("/api/v1/reviews", reviewRoutes);

app.use("/api/v1/blog", blogRoutes);

app.use("/api/v1/contact", contactRoutes);

app.use("/api/v1/upload", uploadRoutes);

// Health check

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Debug test endpoint

app.get("/api/v1/test", (req, res) => {
  res.json({
    message: "API working",

    timestamp: new Date().toISOString(),

    origin: req.headers.origin,

    method: req.method,
  });
});

// Root route for Railway health check

app.get("/", (req, res) => {
  res.json({
    message: "BookShop API Server",

    status: "running",

    timestamp: new Date().toISOString(),

    version: "1.0.0",
  });
});

// Error handling middleware

app.use(notFound);

app.use(errorHandler);

const PORT = envConfig.port;

// Start server

const startServer = async () => {
  try {
    console.log("🚀 Starting server initialization...");

    // Connect to database

    console.log("🔌 Connecting to MongoDB...");

    await connectDB();

    console.log("✅ MongoDB connected");

    // Connect to Redis

    console.log("🔌 Connecting to Redis...");

    const redisConnection = await connectRedis();

    console.log(redisConnection ? "Redis connected" : "Redis unavailable; caching and email queue disabled");

    // Initialize email queue after Redis is connected

    console.log("🔧 Initializing email queue...");

    const { initializeEmailQueue } = await import("./jobs/emailQueue.js");

    await initializeEmailQueue();

    console.log("✅ Email queue initialized");

    // Create HTTP server

    console.log("🌐 Creating HTTP server...");

    const server = createServer(app);

    // Initialize Socket.io

    console.log("🔌 Initializing Socket.io...");

    initializeSocket(server);

    console.log("✅ Socket.io initialized");

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);

      console.log(`📱 Environment: ${process.env.NODE_ENV || "development"}`);

      console.log(`🔗 WebSocket server ready`);
    });

    // Handle server errors

    server.on("error", (error) => {
      console.error("❌ Server error:", error);

      if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use`);
      }
    });

    // Handle uncaught exceptions

    process.on("uncaughtException", (error) => {
      console.error("❌ Uncaught Exception:", error);

      process.exit(1);
    });

    // Handle unhandled promise rejections

    process.on("unhandledRejection", (reason, promise) => {
      console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);

      process.exit(1);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);

    console.error("❌ Error stack:", error.stack);

    process.exit(1);
  }
};

startServer();
