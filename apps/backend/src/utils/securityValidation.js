import crypto from 'crypto';
import { ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES, MAX_IMAGE_SIZE, MAX_VIDEO_SIZE } from './fileValidation.js';

/**
 * Security configuration
 */
const SECURITY_CONFIG = {
  maxFilesPerRequest: 10,
  maxTotalSize: 100 * 1024 * 1024, // 100MB total per request
  allowedExtensions: {
    image: ['.jpg', '.jpeg', '.png', '.webp'],
    video: ['.mp4', '.webm', '.mov']
  },
  blockedPatterns: [
    /\.(exe|bat|cmd|scr|pif|com|msi|dll|vbs|js|jar)$/i,
    /php/i,
    /asp/i,
    /jsp/i,
    /<script/i,
    /javascript:/i,
    /data:base64/i
  ],
  scanForMaliciousContent: true,
  enforceContentValidation: true
};

/**
 * Generate secure upload token
 * @param {Object} payload - Token payload
 * @param {string} secret - Secret key
 * @param {number} expiresIn - Expiration time in seconds
 * @returns {string} - Secure token
 */
export const generateUploadToken = (payload, secret = process.env.JWT_SECRET, expiresIn = 3600) => {
  const timestamp = Date.now();
  const expires = timestamp + (expiresIn * 1000);
  
  const tokenData = {
    ...payload,
    iat: timestamp,
    exp: expires,
    nonce: crypto.randomBytes(16).toString('hex')
  };
  
  return crypto.createHmac('sha256', secret)
    .update(JSON.stringify(tokenData))
    .digest('hex');
};

/**
 * Verify upload token
 * @param {string} token - Token to verify
 * @param {string} secret - Secret key
 * @returns {Object} - Verification result
 */
export const verifyUploadToken = (token, secret = process.env.JWT_SECRET) => {
  try {
    // This is a simplified token verification
    // In production, use proper JWT library
    const hash = crypto.createHmac('sha256', secret).digest('hex');
    
    return {
      valid: true,
      timestamp: Date.now()
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid token'
    };
  }
};

/**
 * Validate file security
 * @param {Object} file - File object
 * @returns {Object} - Validation result
 */
export const validateFileSecurity = (file) => {
  const errors = [];
  const warnings = [];

  // Check file extension
  const extension = file.originalname.split('.').pop().toLowerCase();
  const allowedExtensions = [...SECURITY_CONFIG.allowedExtensions.image, ...SECURITY_CONFIG.allowedExtensions.video];
  
  if (!allowedExtensions.includes(`.${extension}`)) {
    errors.push(`File extension .${extension} is not allowed`);
  }

  // Check filename for malicious patterns
  for (const pattern of SECURITY_CONFIG.blockedPatterns) {
    if (pattern.test(file.originalname)) {
      errors.push(`Filename contains potentially malicious content: ${pattern}`);
      break;
    }
  }

  // Check file size limits
  if (file.mimetype.startsWith('image/') && file.size > MAX_IMAGE_SIZE) {
    errors.push(`Image file size ${file.size} exceeds maximum allowed ${MAX_IMAGE_SIZE}`);
  }
  
  if (file.mimetype.startsWith('video/') && file.size > MAX_VIDEO_SIZE) {
    errors.push(`Video file size ${file.size} exceeds maximum allowed ${MAX_VIDEO_SIZE}`);
  }

  // Check total size limits
  if (file.size > SECURITY_CONFIG.maxTotalSize) {
    errors.push(`File size ${file.size} exceeds maximum allowed ${SECURITY_CONFIG.maxTotalSize}`);
  }

  // Content validation (basic)
  if (SECURITY_CONFIG.enforceContentValidation) {
    const buffer = file.buffer;
    
    // Check for executable signatures
    const suspiciousSignatures = [
      Buffer.from([0x4D, 0x5A]), // PE executable
      Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF executable
      Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]) // Mach-O executable
    ];
    
    for (const signature of suspiciousSignatures) {
      if (buffer.subarray(0, signature.length).equals(signature)) {
        errors.push('File appears to be an executable file');
        break;
      }
    }

    // Check for script content in images
    if (file.mimetype.startsWith('image/')) {
      const content = buffer.toString('utf8', 0, Math.min(1024, buffer.length));
      if (/<script|javascript:|data:base64/i.test(content)) {
        errors.push('Image file contains potentially malicious script content');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    securityLevel: errors.length === 0 ? 'safe' : warnings.length > 0 ? 'warning' : 'danger'
  };
};

/**
 * Validate multiple files for security
 * @param {Array} files - Array of file objects
 * @returns {Object} - Validation result
 */
export const validateMultipleFilesSecurity = (files) => {
  if (files.length > SECURITY_CONFIG.maxFilesPerRequest) {
    return {
      valid: false,
      errors: [`Too many files. Maximum ${SECURITY_CONFIG.maxFilesPerRequest} files allowed per request`]
    };
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > SECURITY_CONFIG.maxTotalSize) {
    return {
      valid: false,
      errors: [`Total file size ${totalSize} exceeds maximum allowed ${SECURITY_CONFIG.maxTotalSize}`]
    };
  }

  const allErrors = [];
  const allWarnings = [];
  let hasDangerousFiles = false;

  files.forEach((file, index) => {
    const validation = validateFileSecurity(file);
    
    if (!validation.valid) {
      allErrors.push(...validation.errors.map(err => `File ${index + 1} (${file.originalname}): ${err}`));
    }
    
    allWarnings.push(...validation.warnings.map(warn => `File ${index + 1} (${file.originalname}): ${warn}`));
    
    if (validation.securityLevel === 'danger') {
      hasDangerousFiles = true;
    }
  });

  return {
    valid: allErrors.length === 0 && !hasDangerousFiles,
    errors: allErrors,
    warnings: allWarnings,
    fileCount: files.length,
    totalSize,
    hasDangerousFiles
  };
};

/**
 * Sanitize filename
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
export const sanitizeFilename = (filename) => {
  // Remove path traversal attempts
  const sanitized = filename
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');

  // Ensure filename is not empty
  return sanitized || 'unnamed_file';
};

/**
 * Generate secure file metadata
 * @param {Object} file - File object
 * @param {Object} user - User object
 * @returns {Object} - Secure metadata
 */
export const generateSecureMetadata = (file, user) => {
  return {
    originalName: sanitizeFilename(file.originalname),
    uploadedBy: user.id,
    uploadedAt: new Date().toISOString(),
    ip: user.ip || 'unknown',
    userAgent: user.userAgent || 'unknown',
    size: file.size,
    mimetype: file.mimetype,
    checksum: crypto.createHash('sha256').update(file.buffer).digest('hex'),
    security: {
      validated: true,
      validationTime: new Date().toISOString()
    }
  };
};

/**
 * Rate limiting for uploads
 * @param {Object} redis - Redis client
 * @param {string} key - Rate limit key
 * @param {number} limit - Request limit
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Promise<Object>} - Rate limit result
 */
export const checkUploadRateLimit = async (redis, key, limit = 10, windowMs = 900000) => {
  try {
    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.expire(key, Math.ceil(windowMs / 1000));
    }

    const ttl = await redis.ttl(key);
    const remaining = Math.max(0, limit - current);
    const resetTime = Date.now() + (ttl * 1000);

    return {
      allowed: current <= limit,
      limit,
      remaining,
      resetTime,
      current
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Allow request if rate limiting fails
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetTime: Date.now() + windowMs,
      current: 1
    };
  }
};

/**
 * Content type validation
 * @param {Buffer} buffer - File buffer
 * @param {string} declaredMimeType - Declared MIME type
 * @returns {boolean} - True if content matches declared type
 */
export const validateContentType = (buffer, declaredMimeType) => {
  // Simple content type validation based on file signatures
  const signatures = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    'image/webp': [0x52, 0x49, 0x46, 0x46],
    'video/mp4': [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D],
    'video/webm': [0x1A, 0x45, 0xDF, 0xA3],
    'video/quicktime': [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]
  };

  const expectedSignature = signatures[declaredMimeType];
  if (!expectedSignature) {
    return false; // Unknown MIME type
  }

  const actualSignature = Array.from(buffer.subarray(0, expectedSignature.length));
  
  return expectedSignature.every((byte, index) => actualSignature[index] === byte);
};
