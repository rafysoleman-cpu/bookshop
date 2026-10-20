import express from 'express';
import { register, login, refreshToken, logout, googleAuth, googleCallback, getMe, forgotPassword, verifyOTP, verifyEmail, resetPassword } from '../controllers/authController.js';
import { adminLogin, adminVerifyOTP, adminResendOTP, getAdminEmails } from '../controllers/adminAuthController.js';
import { protect } from '../middlewares/auth.js';
import { validate, validateWithContext, registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, adminLoginSchema, adminOTPSchema, resendOTPSchema } from '../utils/validation.js';

const router = express.Router();

// Public routes - Traditional auth
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', refreshToken);
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

// Public routes - Admin auth with OTP
router.post('/admin-login', validate(adminLoginSchema), adminLogin);
router.post('/admin-verify-otp', validate(adminOTPSchema), adminVerifyOTP);
router.post('/admin-resend-otp', validate(resendOTPSchema), adminResendOTP);
router.get('/admin-emails', getAdminEmails); // Development only

// Public routes - Email auth
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/verify-otp', verifyOTP);
router.get('/verify-email', verifyEmail);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

// Protected routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

export default router;
