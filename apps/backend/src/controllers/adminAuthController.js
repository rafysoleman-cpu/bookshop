import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { setCache } from '../config/redis.js';
import { sendEmail, emailTemplates } from '../services/email.service.js';

// Helper function to get admin emails (parsed at runtime)
const getAdminEmailsList = () => {
  return process.env.ADMIN_EMAILS ? 
    process.env.ADMIN_EMAILS.split(',').map(email => email.trim().toLowerCase()).filter(email => email.length > 0) : 
    [];
};

// Debug: Log admin emails parsing
console.log('🔧 Admin emails parsed:', getAdminEmailsList());
console.log('🔧 Raw ADMIN_EMAILS env:', process.env.ADMIN_EMAILS);


// @desc    Admin login with OTP verification
// @route   POST /api/v1/auth/admin-login
// @access  Public
export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const adminEmails = getAdminEmailsList(); // Get emails at runtime
    
    // Debug logging
    console.log('🔍 Admin Login Debug:');
    console.log('Input email:', email.toLowerCase());
    console.log('ADMIN_EMAILS:', adminEmails);
    console.log('Email in admin list:', adminEmails.includes(email.toLowerCase()));
    console.log('Raw env ADMIN_EMAILS:', process.env.ADMIN_EMAILS);

    // Validate admin email
    if (!adminEmails.includes(email.toLowerCase())) {
      console.log('❌ Email not in admin list');
      // Don't reveal that email is not admin for security
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if user exists and is admin
    const user = await User.findOne({ email }).select('+password');
    console.log('User found:', !!user);
    console.log('User active:', user?.isActive);
    console.log('User role:', user?.role);
    
    if (!user || !user.isActive) {
      console.log('❌ User not found or inactive');
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if user has admin role (or promote if in admin list)
    if (user.role !== 'admin') {
      if (adminEmails.includes(email.toLowerCase())) {
        console.log('🔼 Auto-promoting user to admin');
        // Auto-promote to admin if email is in admin list
        user.role = 'admin';
        user.isEmailVerified = true;
        await user.save();
      } else {
        console.log('❌ User not admin and not in admin list');
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    console.log('Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    console.log('✅ Admin login validation passed, sending OTP');

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in cache with 5-minute expiry
    const otpKey = `admin_otp:${user._id}`;
    await setCache(otpKey, {
      otp,
      email: user.email,
      timestamp: new Date().toISOString()
    }, 5 * 60); // 5 minutes

    // Send OTP email
    const emailHtml = emailTemplates.adminOTP(user.name, otp, user.email);
    
    const emailResult = await sendEmail(
      user.email, 
      'Admin Login - OTP Verification', 
      emailHtml
    );

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send OTP. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'OTP sent to your email. Please verify to complete login.',
      adminId: user._id
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify admin OTP and complete login
// @route   POST /api/v1/auth/admin-verify-otp
// @access  Public
export const adminVerifyOTP = async (req, res, next) => {
  try {
    const { adminId, otp } = req.body;

    if (!adminId || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Admin ID and OTP are required'
      });
    }

    // Get OTP from cache
    const { getCache, deleteCache } = await import('../config/redis.js');
    const otpKey = `admin_otp:${adminId}`;
    const cachedData = await getCache(otpKey);

    if (!cachedData) {
      return res.status(400).json({
        success: false,
        error: 'OTP has expired or is invalid'
      });
    }

    const { otp: storedOTP, email } = cachedData;

    // Verify OTP
    if (storedOTP !== otp) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP'
      });
    }

    // Get user
    const user = await User.findById(adminId);
    if (!user || !user.isActive || user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        error: 'Invalid admin user'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    // Cache user data
    await setCache(`user:${user._id}`, user.toJSON(), 3600);

    // Delete OTP from cache
    await deleteCache(otpKey);

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend admin OTP
// @route   POST /api/v1/auth/admin-resend-otp
// @access  Public
export const adminResendOTP = async (req, res, next) => {
  try {
    const { adminId } = req.body;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        error: 'Admin ID is required'
      });
    }

    // Get user
    const user = await User.findById(adminId);
    if (!user || !user.isActive || user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        error: 'Invalid admin user'
      });
    }

    // Check if there's an existing OTP that hasn't expired
    const { getCache } = await import('../config/redis.js');
    const otpKey = `admin_otp:${user._id}`;
    const existingOTP = await getCache(otpKey);

    if (existingOTP) {
      const timestamp = new Date(existingOTP.timestamp);
      const timeDiff = Date.now() - timestamp.getTime();
      const oneMinute = 60 * 1000;

      if (timeDiff < oneMinute) {
        return res.status(429).json({
          success: false,
          error: 'Please wait before requesting a new OTP'
        });
      }
    }

    // Generate new OTP
    const newOTP = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in cache with 5-minute expiry
    await setCache(otpKey, {
      otp: newOTP,
      email: user.email,
      timestamp: new Date().toISOString()
    }, 5 * 60);

    // Send OTP email
    const emailHtml = emailTemplates.adminOTP(user.name, newOTP, user.email);
    
    const emailResult = await sendEmail(
      user.email, 
      'Admin Login - OTP Verification', 
      emailHtml
    );

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send OTP. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'New OTP sent to your email'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get predefined admin emails (for debugging)
// @route   GET /api/v1/auth/admin-emails
// @access  Public (only in development)
export const getAdminEmails = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({
        success: false,
        error: 'Not found'
      });
    }

    res.json({
      success: true,
      data: {
        adminEmails: getAdminEmailsList(),
        count: getAdminEmailsList().length
      }
    });
  } catch (error) {
    next(error);
  }
};
