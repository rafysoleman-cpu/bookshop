import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { setCache, deleteCache } from '../config/redis.js';
import { generateEmailToken, generatePasswordResetToken, verifyToken, hashToken } from '../utils/token.js';
import { sendEmail, emailTemplates } from '../services/email.service.js';
import axios from 'axios';

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }

    // Check if this email is in admin list
    const adminEmails = process.env.ADMIN_EMAILS ? 
      process.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase()) : 
      []; // No default admin emails - must be set in .env
    
    const isAdmin = adminEmails.includes(email.toLowerCase());
    const userRole = isAdmin ? 'admin' : 'user';

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: userRole,
      isEmailVerified: isAdmin // Auto-verify admin emails
    });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    // Cache user data
    await setCache(`user:${user._id}`, user.toJSON(), 3600);

    res.status(201).json({
      success: true,
      message: isAdmin ? 
        'Admin account created successfully! Please check your email for OTP verification.' : 
        'User registered successfully!',
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

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
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

    res.json({
      success: true,
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

// @desc    Refresh token
// @route   POST /api/v1/auth/refresh
// @access  Public
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Get user
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    // Check if refresh token exists in user's tokens
    const tokenExists = user.refreshTokens.some(t => t.token === refreshToken);
    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const accessToken = generateAccessToken(user);

    res.json({
      success: true,
      data: {
        accessToken
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    // Remove refresh token from user
    if (refreshToken) {
      req.user.refreshTokens = req.user.refreshTokens.filter(t => t.token !== refreshToken);
      await req.user.save();
    }

    // Delete cached user data
    await deleteCache(`user:${req.user._id}`);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Google OAuth login
// @route   GET /api/v1/auth/google
// @access  Public
export const googleAuth = async (req, res, next) => {
  try {
    const { GOOGLE_CLIENT_ID } = process.env;

    // Auto-detect callback URL based on environment
    const callbackUrl = process.env.GOOGLE_REDIRECT_URI ||
                     process.env.GOOGLE_CALLBACK_URL ||
                     (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5001/api/v1/auth/google/callback');

    console.log(`🎯 Google callback URL: ${callbackUrl}`);

    if (!GOOGLE_CLIENT_ID || !callbackUrl) {
      return res.status(500).json({
        success: false,
        error: 'Google OAuth not configured'
      });
    }

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('email profile openid')}&` +
      `access_type=offline&` +
      `prompt=consent`;

    console.log(`🔗 Google OAuth URL: ${authUrl}`);
    res.redirect(authUrl);
  } catch (error) {
    next(error);
  }
};

// @desc    Google OAuth callback
// @route   GET /api/v1/auth/google/callback
// @access  Public
export const googleCallback = async (req, res, next) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code required'
      });
    }

    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

    // Auto-detect callback URL based on environment
    const callbackUrl = process.env.GOOGLE_REDIRECT_URI ||
                     process.env.GOOGLE_CALLBACK_URL ||
                     (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5001/api/v1/auth/google/callback');

    console.log(`🎯 Google callback URL: ${callbackUrl}`);

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !callbackUrl) {
      return res.status(500).json({
        success: false,
        error: 'Google OAuth not configured'
      });
    }

    // Exchange code for access token
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      redirect_uri: callbackUrl,
      grant_type: 'authorization_code'
    });

    const { access_token, id_token } = tokenResponse.data;

    // Get user info from Google
    const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    const googleUser = {
      id: userResponse.data.id,
      email: userResponse.data.email,
      name: userResponse.data.name,
      avatar: userResponse.data.picture
    };

    // Find or create user
    let user = await User.findOne({
      $or: [
        { googleId: googleUser.id },
        { email: googleUser.email }
      ]
    });

    if (!user) {
      user = await User.create({
        name: googleUser.name,
        email: googleUser.email,
        googleId: googleUser.id,
        avatar: googleUser.avatar,
        isEmailVerified: true
      });
    } else if (!user.googleId) {
      // Link Google account to existing user
      user.googleId = googleUser.id;
      user.avatar = googleUser.avatar;
      user.isEmailVerified = true;
      await user.save();
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

    // Redirect to frontend with tokens
    const frontendUrl = process.env.FRONTEND_URL ||
                      process.env.CORS_ORIGIN ||
                      (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');
    const redirectUrl = `${frontendUrl}/auth/callback?token=${accessToken}&refresh=${refreshToken}`;
    console.log(`🔄 Redirecting to: ${redirectUrl}`);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    console.log('🔍 Forgot password request received:', req.body);
    const { email } = req.body;

    if (!email) {
      console.log('❌ No email provided');
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    console.log('🔍 Looking for user with email:', email);
    const user = await User.findOne({ email });
    if (!user) {
      console.log('ℹ️ User not found, returning generic message');
      return res.json({
        success: true,
        message: 'If an account with this email exists, you will receive password reset instructions.'
      });
    }

    console.log('✅ User found:', user._id);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('🔑 6-digit OTP generated:', otp);

    // Store OTP in database with expiry
    user.passwordResetOTP = otp;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();
    console.log('💾 User updated with OTP');

    // Send email with 6-digit OTP
    const emailHtml = emailTemplates.passwordReset(user.name, otp, user.email);
    console.log('📧 Email template generated with 6-digit OTP');

    console.log('📤 Sending email to:', user.email);
    const emailResult = await sendEmail(user.email, 'Password Reset OTP - Your 6-digit Code', emailHtml);
    console.log('📧 Email result:', emailResult);

    if (!emailResult.success) {
      console.error('❌ Failed to send password reset email:', emailResult.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send reset email. Please try again later.'
      });
    }

    console.log('✅ Password reset email sent successfully');
    res.json({
      success: true,
      message: 'Password reset instructions have been sent to your email.'
    });
  } catch (error) {
    console.error('💥 Forgot password error:', error);
    next(error);
  }
};

// @desc    Verify email
// @route   GET /api/v1/auth/verify-email
// @access  Public
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Verification token is required'
      });
    }

    const decoded = verifyToken(token);

    if (decoded.type !== 'email_verification') {
      return res.status(400).json({
        success: false,
        error: 'Invalid token type'
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'User not found'
      });
    }

    const tokenHash = hashToken(token);
    if (user.emailVerificationToken !== tokenHash) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification token'
      });
    }

    if (user.emailVerificationExpires < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Verification token has expired'
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully! You can now log in.'
    });
  } catch (error) {
    if (error.message === 'Invalid or expired token') {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token'
      });
    }
    next(error);
  }
};

// @desc    Verify OTP for password reset
// @route   POST /api/v1/auth/verify-otp
// @access  Public
export const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
 
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email and OTP are required'
      });
    }
 
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'User not found'
      });
    }
 
    // Check if OTP matches
    if (user.passwordResetOTP !== otp) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP code'
      });
    }
 
    // Check if OTP has expired
    if (user.passwordResetExpires < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'OTP has expired'
      });
    }
 
    // Generate a reset token for the password reset page
    const resetToken = generatePasswordResetToken(user._id, user.email);
    user.passwordResetToken = hashToken(resetToken);
    await user.save();
 
    res.json({
      success: true,
      message: 'OTP verified successfully',
      resetToken // Send token to frontend for reset page
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/v1/auth/reset-password
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token and new password are required'
      });
    }

    const decoded = verifyToken(token);

    if (decoded.type !== 'password_reset') {
      return res.status(400).json({
        success: false,
        error: 'Invalid token type'
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'User not found'
      });
    }

    const tokenHash = hashToken(token);
    if (user.passwordResetToken !== tokenHash) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reset token'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetOTP = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.'
    });
  } catch (error) {
    if (error.message === 'Invalid or expired token') {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }
    next(error);
  }
};
