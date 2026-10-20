import multer from 'multer';

// Memory storage for processing
const storage = multer.memoryStorage();

// File filter for category images
const categoryImageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed for categories.'), false);
  }
};

// Category upload configuration
export const uploadCategoryImage = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
    fields: 10, // Allow up to 10 form fields
    fieldSize: 1024 * 1024 // 1MB per field
  },
  fileFilter: categoryImageFilter
});

// Middleware to handle category image upload with proper error handling
export const handleCategoryImageUpload = (req, res, next) => {
  console.log('🔄 Category upload middleware called');
  console.log('📋 Content-Type:', req.headers['content-type']);
  
  uploadCategoryImage.single('image')(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          error: 'Image file too large. Maximum size is 5MB.'
        });
      }
      
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        // This is fine - just means no image was uploaded
        console.log('ℹ️ No image file uploaded, continuing with text fields only');
        return next();
      }
      
      if (err.code === 'LIMIT_FIELD_COUNT') {
        return res.status(400).json({
          success: false,
          error: 'Too many form fields. Maximum allowed is 10.'
        });
      }
      
      if (err.code === 'LIMIT_FIELD_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'Form field too large. Maximum size per field is 1MB.'
        });
      }
      
      return res.status(400).json({
        success: false,
        error: `Upload failed: ${err.message}`
      });
    }
    
    console.log('✅ Multer processing completed');
    console.log('📋 Request body keys:', Object.keys(req.body || {}));
    console.log('📋 Request file:', req.file ? 'File uploaded' : 'No file uploaded');
    
    // Log body contents for debugging
    if (req.body) {
      Object.keys(req.body).forEach(key => {
        console.log(`📋 ${key}:`, req.body[key]);
      });
    }
    
    next();
  });
};
