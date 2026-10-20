import sharp from 'sharp';

/**
 * Optimize image buffer using sharp
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {Object} options - Optimization options
 * @returns {Promise<Buffer>} - Optimized image buffer
 */
export const optimizeImage = async (imageBuffer, options = {}) => {
  const {
    width = 1024,
    quality = 70,
    format = 'webp',
    progressive = true
  } = options;

  try {
    let pipeline = sharp(imageBuffer);

    // Get image metadata
    const metadata = await pipeline.metadata();
    
    // Only resize if image is wider than the target width
    if (metadata.width > width) {
      pipeline = pipeline.resize(width, null, {
        withoutEnlargement: true,
        fit: 'inside'
      });
    }

    // Apply format and quality settings
    switch (format.toLowerCase()) {
      case 'webp':
        pipeline = pipeline.webp({
          quality,
          progressive,
          effort: 4 // Balanced compression/speed
        });
        break;
      
      case 'jpeg':
      case 'jpg':
        pipeline = pipeline.jpeg({
          quality,
          progressive,
          mozjpeg: true // Better compression
        });
        break;
      
      case 'png':
        pipeline = pipeline.png({
          progressive,
          compressionLevel: 8,
          adaptiveFiltering: true
        });
        break;
      
      default:
        pipeline = pipeline.webp({ quality, progressive });
    }

    // Generate optimized buffer
    const optimizedBuffer = await pipeline.toBuffer();
    
    // Log optimization results
    const originalSize = imageBuffer.length;
    const optimizedSize = optimizedBuffer.length;
    const compressionRatio = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);
    
    console.log(`Image optimized: ${originalSize} bytes → ${optimizedSize} bytes (${compressionRatio}% reduction)`);
    
    return optimizedBuffer;

  } catch (error) {
    console.error('Image optimization failed:', error);
    throw new Error(`Failed to optimize image: ${error.message}`);
  }
};

/**
 * Get image metadata
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<Object>} - Image metadata
 */
export const getImageMetadata = async (imageBuffer) => {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: imageBuffer.length,
      hasAlpha: metadata.hasAlpha,
      density: metadata.density
    };
  } catch (error) {
    console.error('Failed to get image metadata:', error);
    throw new Error(`Failed to get image metadata: ${error.message}`);
  }
};

/**
 * Generate multiple sizes of an image (for responsive images)
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {Array} sizes - Array of width objects [{ width: 300, suffix: 'small' }]
 * @param {Object} options - Optimization options
 * @returns {Promise<Array>} - Array of optimized buffers with metadata
 */
export const generateResponsiveImages = async (imageBuffer, sizes = [], options = {}) => {
  const responsiveImages = [];
  
  const defaultSizes = [
    { width: 300, suffix: 'small' },
    { width: 768, suffix: 'medium' },
    { width: 1024, suffix: 'large' }
  ];
  
  const sizesToGenerate = sizes.length > 0 ? sizes : defaultSizes;
  
  for (const size of sizesToGenerate) {
    try {
      const optimizedBuffer = await optimizeImage(imageBuffer, {
        ...options,
        width: size.width
      });
      
      const metadata = await getImageMetadata(optimizedBuffer);
      
      responsiveImages.push({
        buffer: optimizedBuffer,
        suffix: size.suffix,
        width: metadata.width,
        height: metadata.height,
        size: metadata.size,
        format: options.format || 'webp'
      });
    } catch (error) {
      console.error(`Failed to generate ${size.suffix} image:`, error);
    }
  }
  
  return responsiveImages;
};

/**
 * Validate image buffer
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<boolean>} - True if valid image
 */
export const validateImageBuffer = async (buffer) => {
  try {
    await sharp(buffer).metadata();
    return true;
  } catch (error) {
    return false;
  }
};
