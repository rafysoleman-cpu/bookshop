// Production-ready email service usage examples
 import { sendEmailViaAPI, emailTemplates } from './email.service.js';
// Real service functions for your application
 
// 1. Send verification email (after user registration)
export const sendUserVerificationEmail = async (userEmail, userName, verificationToken) => {
  try {
    const htmlContent = emailTemplates.verification(userName, verificationToken);
 
    const result = await sendEmailViaAPI(
      userEmail,
      'Verify Your Email Address',
      htmlContent
    );
 
    console.log('✅ Verification email sent to:', userEmail);
    return result;
  } catch (error) {
    console.error('❌ Failed to send verification email:', error);
    throw error;
  }
};
 
// 2. Send password reset email
export const sendPasswordResetEmail = async (userEmail, userName, resetToken) => {
  try {
    const htmlContent = emailTemplates.passwordReset(userName, resetToken);
 
     const result = await sendEmailViaAPI(
      userEmail,
      'Reset Your Password',
      htmlContent,
    );
 
    console.log('✅ Password reset email sent to:', userEmail);
    return result;
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    throw error;
  }
};
 
// 3. Send order confirmation
export const sendOrderConfirmationEmail = async (userEmail, orderData) => {
  try {
    const htmlContent = emailTemplates.orderConfirmation(orderData);
 
    const result = await sendEmailViaAPI(
      userEmail,
      `Order Confirmed - #${orderData.orderId}`,
      htmlContent
    );
 
    console.log('✅ Order confirmation sent to:', userEmail);
    return result;
  } catch (error) {
    console.error('❌ Failed to send order confirmation:', error);
    throw error;
  }
};
 
// 4. Send shipping update
export const sendShippingUpdateEmail = async (userEmail, shippingData) => {
  try {
    const htmlContent = emailTemplates.shippingUpdate(shippingData);
 
    const result = await sendEmailViaAPI(
      userEmail,
      `Shipping Update - Order #${shippingData.orderId}`,
      htmlContent
    );
 
    console.log('✅ Shipping update sent to:', userEmail);
    return result;
  } catch (error) {
    console.error('❌ Failed to send shipping update:', error);
    throw error;
  }
};
 
// 5. Send custom email (for any other purposes)
export const sendCustomEmail = async (to, subject, htmlContent, options = {}) => {
  try {
    const result = await sendEmailViaAPI(to, subject, htmlContent);
 
    console.log('✅ Custom email sent to:', to);
    return result;
  } catch (error) {
    console.error('❌ Failed to send custom email:', error);
    throw error;
  }
};
 
// Usage in your controllers:
/*
// User Registration Controller
export const registerUser = async (req, res) => {
  try {
    const { email, name } = req.body;
 
    // ... create user logic ...
 
    // Send verification email
    await sendUserVerificationEmail(
      newUser.email,
      newUser.name,
      newUser.verificationToken
    );
 
    res.status(201).json({
      message: 'User registered successfully. Please check your email for verification.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
 
// Password Reset Controller
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
 
    // ... generate reset token logic ...
 
    // Send password reset email
    await sendPasswordResetEmail(
      email,
      user.name,
      resetToken
    );
 
    res.json({ message: 'Password reset email sent.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
*/
 
console.log('🚀 Production email service functions ready!');
console.log('📧 Available functions:');
console.log('  - sendUserVerificationEmail()');
console.log('  - sendPasswordResetEmail()');
console.log('  - sendOrderConfirmationEmail()');
console.log('  - sendShippingUpdateEmail()');
console.log('  - sendCustomEmail()');