import { uploadImage, uploadVideo } from '../config/multer.js';
import { validateImage, validateVideo, generateSafeFilename, getFileCategory } from '../utils/fileValidation.js';
import { optimizeImage } from '../utils/imageOptimizer.js';
import { optimizeVideo, generateVideoThumbnail, getVideoMetadata } from '../utils/videoOptimizer.js';

/**
 * Middleware to handle multiple image uploads with validation and optimization
 */
export const handleMultipleImageUpload = async (req, res, next) => {
  try {
    console.log('🔍 Starting image upload middleware...');
    console.log('🔍 Headers:', req.headers['content-type']);
    
    // Use multer to handle multiple uploads (up to 10 files)
    uploadImage.array('images', 10)(req, res, async (err) => {
      console.log('🔍 Multer result - err:', err);
      console.log('🔍 Files found:', req.files ? req.files.length : 0);
      
      // Handle specific multer errors
      if (err) {
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: 'Too many files. Maximum 10 images allowed.',
            error: err.message
          });
        } else if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 20MB per image.',
            error: err.message
          });
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          // This is expected when no files are uploaded
          console.log('📝 No files uploaded, continuing...');
        } else {
          console.error('❌ Multer error:', err);
          return res.status(400).json({
            success: false,
            message: 'Upload failed',
            error: err.message
          });
        }
      }

      // If no files uploaded, continue without processing
      if (!req.files || req.files.length === 0) {
        console.log('📝 No files to process, continuing...');
        return next();
      }

      console.log('✅ Images to process:', req.files.length);
      try {
        const processedImages = [];
        
        // Process each image
        for (const file of req.files) {
          console.log('🔍 Processing file:', file.originalname);
          // Additional validation
          const validation = validateImage(file);
          if (!validation.isValid) {
            return res.status(400).json({
              success: false,
              message: validation.error,
              file: file.originalname
            });
          }

          // Generate safe filename
          const safeFilename = generateSafeFilename(file, 'products');

          // Optimize image
          const optimizedBuffer = await optimizeImage(file.buffer, {
            width: 1024,
            quality: 70,
            format: 'webp'
          });

          processedImages.push({
            ...file,
            buffer: optimizedBuffer,
            originalname: safeFilename,
            optimized: true
          });
        }

        // Update the request with processed images
        req.files = processedImages;
        req.fileMetadata = {
          category: 'image',
          count: processedImages.length,
          originalSize: processedImages.reduce((sum, img) => sum + img.size, 0),
          optimizedSize: processedImages.reduce((sum, img) => sum + img.buffer.length, 0),
          compressionRatio: ((processedImages.reduce((sum, img) => sum + img.size, 0) - 
                            processedImages.reduce((sum, img) => sum + img.buffer.length, 0)) / 
                           processedImages.reduce((sum, img) => sum + img.size, 0) * 100).toFixed(2)
        };

        console.log('✅ Image processing completed');
        next();

      } catch (validationError) {
        console.error('❌ Image validation/optimization error:', validationError);
        return res.status(500).json({
          success: false,
          message: 'Image processing failed',
          error: validationError.message
        });
      }
    });

  } catch (error) {
    console.error('❌ Upload middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Upload middleware failed',
      error: error.message
    });
  }
};

/**
 * Universal media upload handler for both images and videos
 */
export const handleMediaUpload = async (req, res, next) => {
  try {
    // Detect file type from field name or use generic upload
    const fieldName = req.body.fieldName || 'file';
    const maxFiles = parseInt(req.body.maxFiles) || 1;
    
    // Use appropriate multer configuration
    const upload = maxFiles > 1 ? uploadImage.array(fieldName, maxFiles) : uploadImage.single(fieldName);
    
    upload(req, res, async (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({
          success: false,
          message: 'Upload failed',
          error: err.message
        });
      }

      // Check if files were uploaded
      const files = req.files || (req.file ? [req.file] : []);
      if (files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files provided'
        });
      }

      try {
        const processedFiles = [];
        let totalOriginalSize = 0;
        let totalOptimizedSize = 0;

        // Process each file
        for (const file of files) {
          totalOriginalSize += file.size;
          const fileCategory = getFileCategory(file.mimetype);
          
          let processedFile;
          
          if (fileCategory === 'image') {
            // Process image
            const validation = validateImage(file);
            if (!validation.isValid) {
              return res.status(400).json({
                success: false,
                message: validation.error,
                file: file.originalname
              });
            }

            const safeFilename = generateSafeFilename(file, 'images');
            const optimizedBuffer = await optimizeImage(file.buffer, {
              width: 1024,
              quality: 70,
              format: 'webp'
            });

            processedFile = {
              ...file,
              buffer: optimizedBuffer,
              originalname: safeFilename,
              optimized: true,
              type: 'image'
            };
            totalOptimizedSize += optimizedBuffer.length;

          } else if (fileCategory === 'video') {
            // Process video
            const validation = validateVideo(file);
            if (!validation.isValid) {
              return res.status(400).json({
                success: false,
                message: validation.error,
                file: file.originalname
              });
            }

            const safeFilename = generateSafeFilename(file, 'videos');
            
            // Get video metadata
            const metadata = await getVideoMetadata(file.buffer);
            
            // Optimize video with progress tracking
            const optimizedBuffer = await optimizeVideo(file.buffer, {
              onProgress: (progress) => {
                // Send progress via Server-Sent Events if client supports it
                if (req.headers.accept === 'text/event-stream') {
                  res.write(`data: ${JSON.stringify({
                    type: 'progress',
                    file: file.originalname,
                    progress: progress.percent
                  })}\n\n`);
                }
              }
            });

            // Generate thumbnail
            const thumbnailBuffer = await generateVideoThumbnail(optimizedBuffer);

            processedFile = {
              ...file,
              buffer: optimizedBuffer,
              originalname: safeFilename,
              optimized: true,
              type: 'video',
              metadata: metadata,
              thumbnail: thumbnailBuffer
            };
            totalOptimizedSize += optimizedBuffer.length;

          } else {
            return res.status(400).json({
              success: false,
              message: `Unsupported file type: ${file.mimetype}`,
              file: file.originalname
            });
          }

          processedFiles.push(processedFile);
        }

        // Update request with processed files
        if (maxFiles > 1) {
          req.files = processedFiles;
        } else {
          req.file = processedFiles[0];
        }

        req.fileMetadata = {
          count: processedFiles.length,
          originalSize: totalOriginalSize,
          optimizedSize: totalOptimizedSize,
          compressionRatio: totalOriginalSize > 0 ? 
            ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize * 100).toFixed(2) : 0,
          files: processedFiles.map(f => ({
            name: f.originalname,
            type: f.type,
            originalSize: f.size,
            optimizedSize: f.buffer.length,
            metadata: f.metadata
          }))
        };

        next();

      } catch (processingError) {
        console.error('Media processing error:', processingError);
        return res.status(500).json({
          success: false,
          message: 'Media processing failed',
          error: processingError.message
        });
      }
    });

  } catch (error) {
    console.error('Upload middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Upload middleware failed',
      error: error.message
    });
  }
};
export const handleImageUpload = async (req, res, next) => {
  try {
    // First, use multer to handle the upload
    uploadImage.single('image')(req, res, async (err) => {
      if (err) {
        console.error('Multer error:', err);
        // If it's a "LIMIT_UNEXPECTED_FILE" error, it might mean no file was uploaded
        // Let's continue without the file if it's not a critical error
        if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_SIZE') {
          console.log('⚠️ No image file uploaded or file too large, continuing without image');
          return next();
        }
        return res.status(400).json({
          success: false,
          message: 'Upload failed',
          error: err.message
        });
      }

      // Check if file was uploaded - if not, continue without image
      if (!req.file) {
        console.log('ℹ️ No image file provided, continuing without image');
        return next();
      }

      try {
        // Additional validation
        const validation = validateImage(req.file);
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            message: validation.error,
            file: req.file.originalname
          });
        }

        // Generate safe filename
        const safeFilename = generateSafeFilename(req.file, 'images');

        // Optimize image
        const optimizedBuffer = await optimizeImage(req.file.buffer, {
          width: 1024,
          quality: 70,
          format: 'webp'
        });

        // Update the request with processed file
        req.file = {
          ...req.file,
          buffer: optimizedBuffer,
          originalname: safeFilename,
          optimized: true
        };

        req.fileMetadata = {
          category: 'image',
          originalSize: req.file.size,
          optimizedSize: optimizedBuffer.length,
          compressionRatio: ((req.file.size - optimizedBuffer.length) / req.file.size * 100).toFixed(2)
        };

        next();

      } catch (validationError) {
        console.error('Image validation/optimization error:', validationError);
        return res.status(500).json({
          success: false,
          message: 'Image processing failed',
          error: validationError.message
        });
      }
    });

  } catch (error) {
    console.error('Upload middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Upload middleware failed',
      error: error.message
    });
  }
};

/**
 * Middleware to handle video uploads with validation
 */
export const handleVideoUpload = async (req, res, next) => {
  try {
    // Use multer to handle the upload
    uploadVideo.single('video')(req, res, async (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({
          success: false,
          message: 'Upload failed',
          error: err.message
        });
      }

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No video file provided'
        });
      }

      try {
        // Validate video
        const validation = validateVideo(req.file);
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            message: validation.error
          });
        }

        // Generate safe filename
        const safeFilename = generateSafeFilename(req.file, 'videos');

        // Update the file object with new filename
        req.file.originalname = safeFilename;

        // Add file metadata to request
        req.fileMetadata = {
          category: 'video',
          size: req.file.size,
          duration: null // Will be populated later if needed
        };

        // Note: Video optimization is not implemented yet
        // This can be added later using ffmpeg
        req.file.optimized = false;

        next();

      } catch (validationError) {
        console.error('Video validation error:', validationError);
        return res.status(500).json({
          success: false,
          message: 'Video processing failed',
          error: validationError.message
        });
      }
    });

  } catch (error) {
    console.error('Upload middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Upload middleware failed',
      error: error.message
    });
  }
};

/**
 * Generic upload middleware for any file type
 * @param {Object} options - Upload options
 * @param {number} options.maxSizeMB - Maximum file size in MB
 * @param {Array} options.allowedTypes - Array of allowed MIME types
 * @param {string} options.fieldName - Form field name
 * @param {string} options.folder - Upload folder prefix
 * @param {boolean} options.optimize - Whether to optimize (for images only)
 */
export const handleFileUpload = (options = {}) => {
  const {
    maxSizeMB = 5,
    allowedTypes = [],
    fieldName = 'file',
    folder = '',
    optimize = false
  } = options;

  return async (req, res, next) => {
    try {
      // Import uploadFile dynamically to avoid circular dependencies
      const { uploadFile } = await import('../config/multer.js');
      
      const upload = uploadFile(maxSizeMB, allowedTypes);
      upload.single(fieldName)(req, res, async (err) => {
        if (err) {
          console.error('Multer error:', err);
          return res.status(400).json({
            success: false,
            message: 'Upload failed',
            error: err.message
          });
        }

        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: `No ${fieldName} file provided`
          });
        }

        try {
          // Generate safe filename
          const safeFilename = generateSafeFilename(req.file, folder);
          req.file.originalname = safeFilename;

          // Get file category
          const category = getFileCategory(req.file.mimetype);

          // Optimize if it's an image and optimization is requested
          if (category === 'image' && optimize) {
            const optimizedBuffer = await optimizeImage(req.file.buffer);
            req.file.buffer = optimizedBuffer;
            req.file.optimized = true;
          } else {
            req.file.optimized = false;
          }

          // Add file metadata
          req.fileMetadata = {
            category,
            size: req.file.size,
            optimizedSize: req.file.optimized ? req.file.buffer.length : req.file.size
          };

          next();

        } catch (processingError) {
          console.error('File processing error:', processingError);
          return res.status(500).json({
            success: false,
            message: 'File processing failed',
            error: processingError.message
          });
        }
      });

    } catch (error) {
      console.error('Upload middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Upload middleware failed',
        error: error.message
      });
    }
  };
};

/**
 * Error handling middleware for upload errors
 */
export const uploadErrorHandler = (error, req, res, next) => {
  console.error('Upload error:', error);

  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File too large',
      error: error.message
    });
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Too many files',
      error: error.message
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field',
      error: error.message
    });
  }

  // Generic error
  res.status(500).json({
    success: false,
    message: 'Upload failed',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
};
