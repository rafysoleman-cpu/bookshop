import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load email-specific environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

// Email configuration
export const EMAIL_CONFIG = {
  // Brevo API Configuration
  apiKey: process.env.BREVO_API_KEY,
  fromEmail: process.env.EMAIL_FROM || 'rafysoleman@gmail.com',
  fromName: process.env.EMAIL_FROM_NAME || 'BookShop',
  
  // Email Settings
  templateUrl: process.env.EMAIL_TEMPLATE_URL || process.env.FRONTEND_URL || 'http://localhost:3001',
  supportEmail: process.env.EMAIL_SUPPORT_EMAIL || process.env.EMAIL_FROM || 'rafysoleman@gmail.com'
};

// Debug function
export const checkEmailConfig = () => {
  console.log('🔧 Email Configuration Check:');
  console.log('API Key exists:', !!EMAIL_CONFIG.apiKey);
  console.log('API Key value:', EMAIL_CONFIG.apiKey ? EMAIL_CONFIG.apiKey.substring(0, 10) + '...' : 'NOT SET');
  console.log('From Email:', EMAIL_CONFIG.fromEmail);
  console.log('From Name:', EMAIL_CONFIG.fromName);
  console.log('Template URL:', EMAIL_CONFIG.templateUrl);
  return EMAIL_CONFIG;
};
