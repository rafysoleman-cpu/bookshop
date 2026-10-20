import { getDefaultUploadService } from '../services/uploadService.js';

/**
 * Upload an image file
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const uploadImage = async (req, res) => {
  try {
    // Check if file was uploaded by middleware
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Get upload service
    const uploadService = await getDefaultUploadService();

    // Check if service is configured
    const isConfigured = await uploadService.isConfigured();
    if (!isConfigured) {
      return res.status(503).json({
        success: false,
        message: 'Upload service is not properly configured'
      });
    }

    // Prepare upload options
    const uploadOptions = {
      folder: 'images',
      tags: ['upload', 'image'],
      ...req.body.options
    };

    // Upload file to storage service
    const uploadResult = await uploadService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      uploadOptions.folder,
      uploadOptions
    );

    // Prepare response
    const response = {
      success: true,
      url: uploadResult.url,
      fileName: uploadResult.fileName,
      type: 'image',
      fileId: uploadResult.fileId,
      size: uploadResult.size,
      metadata: {
        ...req.fileMetadata,
        ...uploadResult.metadata,
        uploadedAt: new Date().toISOString()
      }
    };

    console.log(`Image uploaded successfully: ${uploadResult.fileName}`);
    res.status(200).json(response);

  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Upload a video file
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const uploadVideo = async (req, res) => {
  try {
    // Check if file was uploaded by middleware
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file provided'
      });
    }

    // Get upload service
    const uploadService = await getDefaultUploadService();

    // Check if service is configured
    const isConfigured = await uploadService.isConfigured();
    if (!isConfigured) {
      return res.status(503).json({
        success: false,
        message: 'Upload service is not properly configured'
      });
    }

    // Prepare upload options
    const uploadOptions = {
      folder: 'videos',
      tags: ['upload', 'video'],
      ...req.body.options
    };

    // Upload video file
    const videoUploadResult = await uploadService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      uploadOptions.folder,
      uploadOptions
    );

    // Upload thumbnail if available
    let thumbnailResult = null;
    if (req.file.thumbnail) {
      const thumbnailOptions = {
        folder: 'video-thumbnails',
        tags: ['thumbnail', 'video'],
        ...req.body.options
      };

      thumbnailResult = await uploadService.uploadFile(
        req.file.thumbnail,
        `thumb_${req.file.originalname.replace(/\.[^/.]+$/, '.jpg')}`,
        thumbnailOptions.folder,
        thumbnailOptions
      );
    }

    // Prepare response
    const response = {
      success: true,
      url: videoUploadResult.url,
      fileName: videoUploadResult.fileName,
      type: 'video',
      fileId: videoUploadResult.fileId,
      size: videoUploadResult.size,
      thumbnail: thumbnailResult ? {
        url: thumbnailResult.url,
        fileName: thumbnailResult.fileName,
        fileId: thumbnailResult.fileId,
        size: thumbnailResult.size
      } : null,
      metadata: {
        ...req.fileMetadata,
        ...videoUploadResult.metadata,
        videoMetadata: req.file.metadata,
        uploadedAt: new Date().toISOString()
      }
    };

    console.log(`Video uploaded successfully: ${videoUploadResult.fileName}`);
    res.status(200).json(response);

  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload video',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Delete a file
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: 'File ID is required'
      });
    }

    // Get upload service
    const uploadService = await getDefaultUploadService();

    // Delete file
    const deleted = await uploadService.deleteFile(fileId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'File not found or could not be deleted'
      });
    }

    console.log(`File deleted successfully: ${fileId}`);
    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get file metadata
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getFileMetadata = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: 'File ID is required'
      });
    }

    // Get upload service
    const uploadService = await getDefaultUploadService();

    // Get file metadata
    const metadata = await uploadService.getFileMetadata(fileId);

    res.status(200).json({
      success: true,
      metadata
    });

  } catch (error) {
    console.error('Get file metadata error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get file metadata',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * List files in a folder
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const listFiles = async (req, res) => {
  try {
    const { folder = '' } = req.query;
    const options = {
      limit: parseInt(req.query.limit) || 50,
      skip: parseInt(req.query.skip) || 0,
      fileType: req.query.fileType || 'all'
    };

    // Get upload service
    const uploadService = await getDefaultUploadService();

    // List files
    const result = await uploadService.listFiles(folder, options);

    res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list files',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Generate a signed URL for temporary access
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getSignedUrl = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { expiresIn = 3600 } = req.query;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: 'File ID is required'
      });
    }

    // Get upload service
    const uploadService = await getDefaultUploadService();

    // Generate signed URL
    const signedUrl = await uploadService.getSignedUrl(fileId, parseInt(expiresIn));

    res.status(200).json({
      success: true,
      signedUrl,
      expiresIn: parseInt(expiresIn)
    });

  } catch (error) {
    console.error('Generate signed URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate signed URL',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Upload any media file (image or video) with automatic optimization
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const uploadMedia = async (req, res) => {
  try {
    // Check if files were uploaded by middleware
    const files = req.files || (req.file ? [req.file] : []);
    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No media files provided'
      });
    }

    // Get upload service
    const uploadService = await getDefaultUploadService();

    // Check if service is configured
    const isConfigured = await uploadService.isConfigured();
    if (!isConfigured) {
      return res.status(503).json({
        success: false,
        message: 'Upload service is not properly configured'
      });
    }

    const uploadResults = [];
    const uploadOptions = {
      folder: req.body.folder || 'media',
      tags: ['upload', 'media', ...(req.body.tags || [])],
      ...req.body.options
    };

    // Upload each file
    for (const file of files) {
      try {
        // Upload main file
        const fileUploadResult = await uploadService.uploadFile(
          file.buffer,
          file.originalname,
          uploadOptions.folder,
          uploadOptions
        );

        let thumbnailResult = null;
        
        // Upload thumbnail if it's a video
        if (file.type === 'video' && file.thumbnail) {
          const thumbnailOptions = {
            folder: `${uploadOptions.folder}-thumbnails`,
            tags: ['thumbnail', 'video'],
            ...req.body.options
          };

          thumbnailResult = await uploadService.uploadFile(
            file.thumbnail,
            `thumb_${file.originalname.replace(/\.[^/.]+$/, '.jpg')}`,
            thumbnailOptions.folder,
            thumbnailOptions
          );
        }

        uploadResults.push({
          success: true,
          url: fileUploadResult.url,
          fileName: fileUploadResult.fileName,
          type: file.type,
          fileId: fileUploadResult.fileId,
          size: fileUploadResult.size,
          thumbnail: thumbnailResult ? {
            url: thumbnailResult.url,
            fileName: thumbnailResult.fileName,
            fileId: thumbnailResult.fileId,
            size: thumbnailResult.size
          } : null,
          metadata: {
            ...fileUploadResult.metadata,
            fileMetadata: file.metadata,
            uploadedAt: new Date().toISOString()
          }
        });

      } catch (fileError) {
        console.error(`Failed to upload ${file.originalname}:`, fileError);
        uploadResults.push({
          success: false,
          fileName: file.originalname,
          error: fileError.message
        });
      }
    }

    // Check if all uploads succeeded
    const failedUploads = uploadResults.filter(result => !result.success);
    if (failedUploads.length > 0) {
      return res.status(207).json({ // 207 Multi-Status
        success: false,
        message: 'Some files failed to upload',
        results: uploadResults,
        failed: failedUploads.length,
        succeeded: uploadResults.length - failedUploads.length
      });
    }

    console.log(`Successfully uploaded ${uploadResults.length} media files`);
    res.status(200).json({
      success: true,
      message: 'All files uploaded successfully',
      results: uploadResults,
      count: uploadResults.length,
      metadata: req.fileMetadata
    });

  } catch (error) {
    console.error('Media upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload media',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get upload service status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getServiceStatus = async (req, res) => {
  try {
    // Get upload service
    const uploadService = await getDefaultUploadService();

    // Check service status
    const isConfigured = await uploadService.isConfigured();

    res.status(200).json({
      success: true,
      service: {
        configured: isConfigured,
        provider: process.env.STORAGE_PROVIDER || 'imagekit',
        status: isConfigured ? 'healthy' : 'misconfigured'
      }
    });

  } catch (error) {
    console.error('Get service status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get service status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};
