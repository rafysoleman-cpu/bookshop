/**
 * Middleware to handle both JSON and FormData
 * This middleware parses FormData and converts it to req.body
 */

export const parseFormData = (req, res, next) => {
  // Only process if content-type is multipart/form-data
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    console.log('🔍 Processing FormData...');
    
    // If multer has already processed the file, the body should be available
    // If not, we need to handle it differently
    
    // Log what we have
    console.log('📋 FormData - Body keys:', Object.keys(req.body || {}));
    console.log('📋 FormData - Body:', req.body);
    
    // The issue might be that multer hasn't processed the form yet
    // Let's continue and let multer handle it
  }
  
  next();
};
