import mongoose from 'mongoose';
import Product from '../models/Product.js';

const preventUnhandledModelErrors = (model) => {
  model.on('error', (error) => {
    console.error(`❌ ${model.modelName} model error:`, error.message);
  });
};

const reconcileProductIndexes = async () => {
  try {
    await Product.syncIndexes();
    console.log('✅ Product indexes reconciled');
  } catch (error) {
    console.error('❌ Product index reconciliation failed:', error.message);
  }
};

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.name}`);

    preventUnhandledModelErrors(Product);
    await reconcileProductIndexes();

    return conn;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
};

// Handle connection events (only in production)
if (process.env.NODE_ENV === 'production') {
  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected');
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed through app termination');
  process.exit(0);
});
