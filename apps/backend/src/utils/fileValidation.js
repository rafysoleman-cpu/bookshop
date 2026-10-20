import { v4 as uuidv4 } from 'uuid';

// Allowed MIME types
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp'
];

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime' // .mov
];

// File size limits (in bytes)
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Validate image file
 * @param {Object} file - Multer file object
 * @returns {Object} - { isValid: boolean, error: string|null }
 */
export const validateImage = (file) => {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    return { 
      isValid: false, 
      error: `Invalid image type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}` 
    };
  }

  // Check file size
  if (file.size > MAX_IMAGE_SIZE) {
    return { 
      isValid: false, 
      error: `Image size too large. Maximum size: ${MAX_IMAGE_SIZE / 1024 / 1024}MB` 
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate video file
 * @param {Object} file - Multer file object
 * @returns {Object} - { isValid: boolean, error: string|null }
 */
export const validateVideo = (file) => {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  // Check file type
  if (!ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
    return { 
      isValid: false, 
      error: `Invalid video type. Allowed types: ${ALLOWED_VIDEO_TYPES.join(', ')}` 
    };
  }

  // Check file size
  if (file.size > MAX_VIDEO_SIZE) {
    return { 
      isValid: false, 
      error: `Video size too large. Maximum size: ${MAX_VIDEO_SIZE / 1024 / 1024}MB` 
    };
  }

  return { isValid: true, error: null };
};

/**
 * Generate a safe, unique filename
 * @param {Object} file - Multer file object
 * @param {string} prefix - Optional prefix for the filename
 * @returns {string} - Safe filename
 */
export const generateSafeFilename = (file, prefix = '') => {
  const ext = file.originalname.split('.').pop().toLowerCase();
  const uuid = uuidv4();
  const timestamp = Date.now();
  
  // Remove any special characters from prefix
  const safePrefix = prefix ? `${prefix.replace(/[^a-zA-Z0-9]/g, '_')}_` : '';
  
  return `${safePrefix}${timestamp}_${uuid}.${ext}`;
};

/**
 * Get file type category
 * @param {string} mimetype - MIME type
 * @returns {string} - 'image', 'video', or 'unknown'
 */
export const getFileCategory = (mimetype) => {
  if (ALLOWED_IMAGE_TYPES.includes(mimetype)) return 'image';
  if (ALLOWED_VIDEO_TYPES.includes(mimetype)) return 'video';
  return 'unknown';
};

/**
 * Sanitize filename to prevent path traversal
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
export const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
};
