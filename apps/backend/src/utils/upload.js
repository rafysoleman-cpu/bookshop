import multer from 'multer';
import sharp from 'sharp';
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

// Configure AWS S3 (DigitalOcean Spaces)
const s3 = new AWS.S3({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  accessKeyId: process.env.DO_SPACES_ACCESS_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET_KEY,
  region: process.env.DO_SPACES_REGION
});

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, MP4, and WebM files are allowed.'), false);
  }
};

// Multer configuration
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter
});

// Image optimization
const optimizeImage = async (buffer, options = {}) => {
  const {
    width = 800,
    height = 600,
    quality = 80,
    format = 'jpeg'
  } = options;

  let image = sharp(buffer);

  // Resize if dimensions are provided
  if (width || height) {
    image = image.resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true
    });
  }

  // Convert format and optimize
  switch (format) {
    case 'webp':
      image = image.webp({ quality });
      break;
    case 'png':
      image = image.png({ quality });
      break;
    default:
      image = image.jpeg({ quality });
  }

  return await image.toBuffer();
};

// Generate thumbnail for video
const generateVideoThumbnail = async (buffer) => {
  // For video thumbnails, you would need ffmpeg
  // For now, we'll return a placeholder
  // In production, you would use ffmpeg to extract thumbnail
  return Buffer.from('thumbnail-placeholder');
};

// Upload file to DigitalOcean Spaces
const uploadToSpaces = async (buffer, fileName, contentType, isPublic = true) => {
  const params = {
    Bucket: process.env.DO_SPACES_BUCKET,
    Key: fileName,
    Body: buffer,
    ContentType: contentType,
    ACL: isPublic ? 'public-read' : 'private'
  };

  try {
    const result = await s3.upload(params).promise();
    return result.Location;
  } catch (error) {
    console.error('Error uploading to Spaces:', error);
    throw new Error('Failed to upload file');
  }
};

// Delete file from Spaces
const deleteFromSpaces = async (fileUrl) => {
  try {
    const fileName = fileUrl.split('/').pop();
    const params = {
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: fileName
    };

    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    console.error('Error deleting from Spaces:', error);
    throw new Error('Failed to delete file');
  }
};

// Main upload handler
export const handleFileUpload = async (files, options = {}) => {
  const {
    folder = 'uploads',
    optimize = true,
    maxWidth = 800,
    maxHeight = 600,
    quality = 80,
    format = 'jpeg'
  } = options;

  const uploadedFiles = [];

  for (const file of files) {
    try {
      let buffer = file.buffer;
      let fileName = `${folder}/${uuidv4()}`;
      let contentType = file.mimetype;

      // Optimize images
      if (file.mimetype.startsWith('image/') && optimize) {
        buffer = await optimizeImage(buffer, {
          width: maxWidth,
          height: maxHeight,
          quality,
          format
        });
        
        // Update filename with extension
        fileName += `.${format}`;
        contentType = `image/${format}`;
      } else if (file.mimetype.startsWith('video/')) {
        // Handle video uploads
        fileName += '.mp4';
        
        // Generate thumbnail
        const thumbnailBuffer = await generateVideoThumbnail(buffer);
        const thumbnailName = `${folder}/thumbnails/${uuidv4()}.jpg`;
        const thumbnailUrl = await uploadToSpaces(
          thumbnailBuffer,
          thumbnailName,
          'image/jpeg'
        );

        uploadedFiles.push({
          url: await uploadToSpaces(buffer, fileName, contentType),
          thumbnail: thumbnailUrl,
          type: 'video',
          originalName: file.originalname
        });
        
        continue;
      } else {
        // Handle other file types
        const extension = file.originalname.split('.').pop();
        fileName += `.${extension}`;
      }

      const url = await uploadToSpaces(buffer, fileName, contentType);

      uploadedFiles.push({
        url,
        type: file.mimetype.startsWith('image/') ? 'image' : 'file',
        originalName: file.originalname
      });
    } catch (error) {
      console.error(`Error uploading file ${file.originalname}:`, error);
      throw new Error(`Failed to upload ${file.originalname}`);
    }
  }

  return uploadedFiles;
};

// Multiple upload middleware
export const uploadMultiple = (fieldName, maxCount = 5) => {
  return upload.array(fieldName, maxCount);
};

// Single upload middleware
export const uploadSingle = (fieldName) => {
  return upload.single(fieldName);
};

// CDN URL helper
export const getCDNUrl = (filePath) => {
  return `${process.env.BUNNY_CDN_URL}/${filePath}`;
};

export default {
  upload,
  uploadSingle,
  uploadMultiple,
  handleFileUpload,
  deleteFromSpaces,
  getCDNUrl
};
