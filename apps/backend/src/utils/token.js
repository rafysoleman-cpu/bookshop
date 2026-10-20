import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Generate secure random token
export const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate JWT token for email verification
export const generateEmailToken = (userId, email) => {
  return jwt.sign(
    { 
      userId, 
      email, 
      type: 'email_verification',
      timestamp: Date.now()
    },
    process.env.JWT_EMAIL_SECRET || process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Generate JWT token for password reset
export const generatePasswordResetToken = (userId, email) => {
  return jwt.sign(
    { 
      userId, 
      email, 
      type: 'password_reset',
      timestamp: Date.now()
    },
    process.env.JWT_EMAIL_SECRET || process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_EMAIL_SECRET || process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Hash token for database storage
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
