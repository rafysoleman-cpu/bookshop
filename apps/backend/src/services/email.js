// Simple email service export - import this in your controllers
export {
  sendEmailViaAPI,
  emailTemplates
} from './email.service.js';
 
export {
  sendUserVerificationEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendShippingUpdateEmail,
  sendCustomEmail
} from './email.production.js';
 
// Quick usage example:
/*
import { sendPasswordResetEmail } from './email.js';
 
// In your controller:
await sendPasswordResetEmail(
  'user@example.com',
  'John Doe',
  'reset-token-123'
);


// Ready to use functions:
sendPasswordResetEmail(email, name, token) // ✅ For your current need
sendUserVerificationEmail(email, name, token)
sendOrderConfirmationEmail(email, orderData)
sendShippingUpdateEmail(email, shippingData)
sendCustomEmail(email, subject, html)
*/
 