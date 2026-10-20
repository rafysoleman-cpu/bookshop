import nodemailer from 'nodemailer';
import axios from 'axios';
import { EMAIL_CONFIG, checkEmailConfig } from './emailConfig.js';

// Use dedicated email configuration (no fallback for security)
const BREVO_CONFIG = {
  apiKey: EMAIL_CONFIG.apiKey,
  fromEmail: EMAIL_CONFIG.fromEmail,
  fromName: EMAIL_CONFIG.fromName
};

// Debug: Check environment variables (moved to function)
const checkEnvironment = () => {
  checkEmailConfig(); // Use dedicated email configuration check
};

// Brevo API client
const createBrevoAPIClient = () => {
  checkEnvironment(); // Check environment when actually using the service
  console.log('🔧 Creating Brevo API client...');
  
  if (!BREVO_CONFIG.apiKey) {
    console.error('❌ Brevo API Key is missing!');
    throw new Error('Brevo API Key is required. Please check your .env file.');
  }
  
  console.log('🔧 API Key (first 10 chars):', BREVO_CONFIG.apiKey.substring(0, 10) + '...');
  
  return axios.create({
    baseURL: 'https://api.brevo.com/v3',
    headers: {
      'api-key': BREVO_CONFIG.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
};

// Brevo API email sending
const sendWithBrevoAPI = async (to, subject, html, text = null) => {
  try {
    console.log('📧 Sending via Brevo API...');
    const apiClient = createBrevoAPIClient();
    
    const emailData = {
      sender: {
        name: BREVO_CONFIG.fromName,
        email: BREVO_CONFIG.fromEmail,
      },
      to: Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text || html.replace(/<[^>]*>/g, ''),
    };
    
    console.log('📧 API Request data:', {
      sender: emailData.sender,
      to: emailData.to,
      subject: emailData.subject,
    });
    
    const response = await apiClient.post('/smtp/email', emailData);
    
    console.log('✅ Brevo API response:', response.data);
    return { 
      success: true, 
      messageId: response.data.messageId,
      method: 'api',
      apiResponse: response.data
    };
  } catch (error) {
    console.error('💥 Brevo API error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data || error.message, 
      method: 'api' 
    };
  }
};

// Main email sending function - Brevo API only
export const sendEmail = async (to, subject, html, text = null) => {
  console.log('🚀 Starting email send process...');
  console.log('📧 To:', to);
  console.log('📧 Subject:', subject);
  console.log('📧 Method: Brevo API');
  
  try {
    const result = await sendWithBrevoAPI(to, subject, html, text);
    console.log('📧 Final email result:', result);
    return result;
  } catch (error) {
    console.error('💥 Email service critical error:', error);
    return { success: false, error, method: 'api' };
  }
};

// Convenience method for API only
export const sendEmailViaAPI = sendEmail;

// Email templates
export const emailTemplates = {
  verification: (name, verificationLink) => {
    const clientUrl = process.env.FRONTEND_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const fullLink = `${clientUrl}/verify-email?token=${verificationLink}`;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4f46e5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 40px 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Verify Your Email Address</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          <p>Thank you for registering! Please click the button below to verify your email address:</p>
          <a href="${fullLink}" class="button">Verify Email</a>
          <p>This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} BookShop. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  },
  
  passwordReset: (name, otp, email) => {
    // Support multiple environments
    const clientUrl = process.env.FRONTEND_URL || 
                     process.env.VERCEL_URL || 
                     'http://localhost:3000';
    
    // Ensure proper URL format
    const baseUrl = clientUrl.startsWith('http') ? clientUrl : `https://${clientUrl}`;
    const resetPasswordUrl = `${baseUrl}/reset-password?otp=${otp}&email=${encodeURIComponent(email)}`;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password - OTP</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ef4444; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 40px 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .otp-box { background: #f3f4f6; border: 2px dashed #d1d5db; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .otp-code { font-size: 32px; font-weight: bold; color: #1f2937; letter-spacing: 4px; margin: 10px 0; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .instructions { background: #e0f2fe; border: 1px solid #0ea5e9; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .env-info { background: #f0f9ff; border: 1px solid #0284c7; padding: 10px; border-radius: 4px; margin: 15px 0; font-size: 12px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset OTP</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          <p>We received a request to reset your password. Use the OTP code below:</p>
          
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <p><strong>Your 6-Digit OTP Code:</strong> ${otp}</p>
          </div>
          
          <div class="instructions">
            <h3>How to use this OTP:</h3>
            <ol>
              <li>Click the button below for quick reset</li>
              <li>Or go to reset page and enter this code: <strong>${otp}</strong></li>
              <li>Set your new password</li>
            </ol>
          </div>
          
          <p><strong>Quick Reset:</strong> <a href="${resetPasswordUrl}" class="button">Reset Password Now</a></p>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #4f46e5;">${resetPasswordUrl}</p>
          
          <div class="env-info">
            Environment: ${baseUrl.includes('localhost') ? 'Development' : baseUrl.includes('vercel') ? 'Vercel Staging' : 'Production'}
          </div>
          
          <div class="warning">
            <strong>Security Notice:</strong> 
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>This code expires in 15 minutes</li>
              <li>If you didn't request this reset, please ignore this email</li>
              <li>Never share this code with anyone</li>
            </ul>
          </div>
        </div>
        <div class="footer" style="text-align: center; padding: 20px; color: #6b7280; font-size: 14px;">
          <p>&copy; ${new Date().getFullYear()} BookShop. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  },
  
  orderConfirmation: (orderData) => {
    const clientUrl = process.env.FRONTEND_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 40px 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        .order-info { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Confirmed!</h1>
        </div>
        <div class="content">
          <p>Hi ${orderData.customerName},</p>
          <p>Thank you for your order! We've received your order and will notify you once it ships.</p>
          <div class="order-info">
            <h3>Order Details</h3>
            <p><strong>Order ID:</strong> ${orderData.orderId}</p>
            <p><strong>Total Amount:</strong> $${orderData.totalAmount}</p>
            <p><strong>Payment Method:</strong> ${orderData.paymentMethod}</p>
          </div>
          <a href="${clientUrl}/orders/${orderData.orderId}" class="button">View Order Details</a>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} BookShop. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  },
  
  shippingUpdate: (shippingData) => {
    const clientUrl = process.env.FRONTEND_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Shipping Update</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 40px 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        .tracking-info { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Shipping Update</h1>
        </div>
        <div class="content">
          <p>Hi ${shippingData.customerName},</p>
          <p>Great news! Your order has been shipped and is on its way to you.</p>
          <div class="tracking-info">
            <h3>Tracking Information</h3>
            <p><strong>Order ID:</strong> ${shippingData.orderId}</p>
            <p><strong>Tracking Number:</strong> ${shippingData.trackingNumber}</p>
            <p><strong>Carrier:</strong> ${shippingData.carrier}</p>
            <p><strong>Estimated Delivery:</strong> ${shippingData.estimatedDelivery}</p>
          </div>
          <a href="${clientUrl}/track/${shippingData.trackingNumber}" class="button">Track Your Package</a>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} BookShop. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  },

  adminOTP: (name, otp, email) => {
    const clientUrl = process.env.FRONTEND_URL || 
                     process.env.VERCEL_URL || 
                     'http://localhost:3000';
    const adminLoginUrl = `${clientUrl}/admin/verify-otp?email=${encodeURIComponent(email)}`;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Login - OTP Verification</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 40px 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .otp-box { background: #fef2f2; border: 2px solid #fca5a5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .otp-code { font-size: 36px; font-weight: bold; color: #dc2626; letter-spacing: 6px; margin: 15px 0; }
        .security-notice { background: #fee2e2; border: 1px solid #fca5a5; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .admin-notice { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .timestamp { color: #6b7280; font-size: 14px; text-align: center; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Admin Login Verification</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          <p>A login attempt was made for your admin account. Use the OTP code below to verify your identity:</p>
          
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <p><strong>Your One-Time Password:</strong> ${otp}</p>
          </div>
          
          <div class="admin-notice">
            <strong>⚠️ Admin Access Notice:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>This code provides access to administrative functions</li>
              <li>Only enter this code on the official admin portal</li>
              <li>Verify the URL matches: <code>${clientUrl}</code></li>
            </ul>
          </div>
          
          <p><strong>Quick Verification:</strong> <a href="${adminLoginUrl}" class="button">Verify OTP Now</a></p>
          <p>If button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #dc2626;">${adminLoginUrl}</p>
          
          <div class="security-notice">
            <strong>🛡️ Security Information:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>This OTP expires in <strong>5 minutes</strong></li>
              <li>If you didn't request this login, contact security immediately</li>
              <li>Never share this code with anyone</li>
              <li>Admin access is logged and monitored</li>
            </ul>
          </div>
          
          <div class="timestamp">
            Requested at: ${new Date().toLocaleString()}
          </div>
        </div>
        <div class="footer" style="text-align: center; padding: 20px; color: #6b7280; font-size: 14px;">
          <p>&copy; ${new Date().getFullYear()} BookShop Admin. All rights reserved.</p>
          <p style="color: #dc2626; font-weight: bold;">This is a secure admin communication</p>
        </div>
      </div>
    </body>
    </html>
  `;
  }
};
