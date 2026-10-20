import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  uploadImage,
  uploadVideo,
  uploadMedia,
  deleteFile,
  getFileMetadata,
  listFiles,
  getSignedUrl,
  getServiceStatus
} from '../controllers/uploadController.js';
import {
  handleImageUpload,
  handleVideoUpload,
  handleMediaUpload,
  uploadErrorHandler
} from '../middlewares/uploadMiddleware.js';

const router = Router();

// Rate limiting configuration
const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 uploads per windowMs
  message: {
    success: false,
    message: 'Too many upload attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/upload/image
 * @desc    Upload an image file
 * @access  Public (or protected as needed)
 */
router.post('/image', 
  uploadRateLimit,
  handleImageUpload,
  uploadImage
);

/**
 * @route   POST /api/v1/upload/video
 * @desc    Upload a video file
 * @access  Public (or protected as needed)
 */
router.post('/video',
  uploadRateLimit,
  handleVideoUpload,
  uploadVideo
);

/**
 * @route   POST /api/v1/upload/media
 * @desc    Upload any media file (image or video) with automatic optimization
 * @access  Public (or protected as needed)
 */
router.post('/media',
  uploadRateLimit,
  handleMediaUpload,
  uploadMedia
);

/**
 * @route   DELETE /api/upload/:fileId
 * @desc    Delete a file
 * @access  Public (or protected as needed)
 */
router.delete('/:fileId',
  generalRateLimit,
  deleteFile
);

/**
 * @route   GET /api/upload/:fileId/metadata
 * @desc    Get file metadata
 * @access  Public (or protected as needed)
 */
router.get('/:fileId/metadata',
  generalRateLimit,
  getFileMetadata
);

/**
 * @route   GET /api/upload/:fileId/signed-url
 * @desc    Generate signed URL for temporary access
 * @access  Public (or protected as needed)
 */
router.get('/:fileId/signed-url',
  generalRateLimit,
  getSignedUrl
);

/**
 * @route   GET /api/upload
 * @desc    List files in a folder
 * @access  Public (or protected as needed)
 */
router.get('/',
  generalRateLimit,
  listFiles
);

/**
 * @route   GET /api/upload/status
 * @desc    Get upload service status
 * @access  Public (or protected as needed)
 */
router.get('/service/status',
  generalRateLimit,
  getServiceStatus
);

// Apply error handling middleware for upload routes
router.use(uploadErrorHandler);

export default router;
