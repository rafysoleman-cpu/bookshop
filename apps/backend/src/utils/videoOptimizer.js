import ffmpeg from 'ffmpeg-static';
import { createWriteStream, createReadStream, existsSync, mkdirSync, writeFileSync, unlinkSync, readFileSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Video optimization configuration
 */
const VIDEO_CONFIG = {
  maxResolution: {
    width: 1920, // Max 1080p
    height: 1080
  },
  bitrate: {
    standard: '1000k',    // For standard videos
    high: '2000k'         // For high quality videos
  },
  audioBitrate: '128k',
  codec: 'libx264',
  format: 'mp4',
  preset: 'medium', // Balance between speed and quality
  crf: 23 // Constant Rate Factor (lower = better quality, higher = smaller file)
};

/**
 * Get video metadata using ffmpeg
 * @param {Buffer} videoBuffer - Video buffer
 * @returns {Promise<Object>} - Video metadata
 */
export const getVideoMetadata = async (videoBuffer) => {
  const tempInputPath = path.join(__dirname, '../../temp', `temp_input_${Date.now()}.mp4`);
  
  try {
    // Ensure temp directory exists
    const tempDir = path.dirname(tempInputPath);
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    // Write buffer to temp file
    writeFileSync(tempInputPath, videoBuffer);

    // Get metadata using ffprobe (part of ffmpeg)
    const ffprobePath = ffmpeg.replace(/ffmpeg[^/]*$/, 'ffprobe');
    const { stdout } = await execAsync(`"${ffprobePath}" -v quiet -print_format json -show_format -show_streams "${tempInputPath}"`);
    
    const metadata = JSON.parse(stdout);

    const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
    const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');

    return {
      duration: metadata.format.duration,
      size: metadata.format.size,
      format: metadata.format.format_name,
      bitrate: metadata.format.bit_rate,
      video: videoStream ? {
        codec: videoStream.codec_name,
        width: videoStream.width,
        height: videoStream.height,
        fps: eval(videoStream.r_frame_rate),
        pixelFormat: videoStream.pix_fmt
      } : null,
      audio: audioStream ? {
        codec: audioStream.codec_name,
        sampleRate: audioStream.sample_rate,
        channels: audioStream.channels,
        bitrate: audioStream.bit_rate
      } : null
    };
  } catch (error) {
    throw new Error(`Failed to get video metadata: ${error.message}`);
  } finally {
    // Clean up temp file
    try {
      if (existsSync(tempInputPath)) {
        unlinkSync(tempInputPath);
      }
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp file:', cleanupError.message);
    }
  }
};

/**
 * Optimize video buffer
 * @param {Buffer} videoBuffer - Original video buffer
 * @param {Object} options - Optimization options
 * @returns {Promise<Buffer>} - Optimized video buffer
 */
export const optimizeVideo = async (videoBuffer, options = {}) => {
  const {
    maxResolution = VIDEO_CONFIG.maxResolution,
    bitrate = VIDEO_CONFIG.bitrate.standard,
    audioBitrate = VIDEO_CONFIG.audioBitrate,
    codec = VIDEO_CONFIG.codec,
    format = VIDEO_CONFIG.format,
    preset = VIDEO_CONFIG.preset,
    crf = VIDEO_CONFIG.crf,
    onProgress = null
  } = options;

  const tempInputPath = path.join(__dirname, '../../temp', `temp_input_${Date.now()}.mp4`);
  const tempOutputPath = path.join(__dirname, '../../temp', `temp_output_${Date.now()}.mp4`);
  
  try {
    // Ensure temp directory exists
    const tempDir = path.dirname(tempInputPath);
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    // Write buffer to temp file
    writeFileSync(tempInputPath, videoBuffer);

    // Get video metadata first
    const ffprobePath = ffmpeg.replace(/ffmpeg[^/]*$/, 'ffprobe');
    const { stdout: metadataOutput } = await execAsync(`"${ffprobePath}" -v quiet -print_format json -show_format -show_streams "${tempInputPath}"`);
    const metadata = JSON.parse(metadataOutput);
    
    const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
    if (!videoStream) {
      throw new Error('No video stream found in file');
    }

    // Calculate target resolution
    let targetWidth = videoStream.width;
    let targetHeight = videoStream.height;

    if (videoStream.width > maxResolution.width || videoStream.height > maxResolution.height) {
      const aspectRatio = videoStream.width / videoStream.height;
      
      if (aspectRatio > (maxResolution.width / maxResolution.height)) {
        targetWidth = maxResolution.width;
        targetHeight = Math.round(maxResolution.width / aspectRatio);
      } else {
        targetHeight = maxResolution.height;
        targetWidth = Math.round(maxResolution.height * aspectRatio);
      }
    }

    // Build ffmpeg command
    const ffmpegCommand = [
      `"${ffmpeg}"`,
      `-i "${tempInputPath}"`,
      `-c:v ${codec}`,
      `-c:a aac`,
      `-ab ${audioBitrate}`,
      `-ar 44100`,
      `-ac 2`,
      `-f ${format}`,
      `-preset ${preset}`,
      `-crf ${crf}`,
      `-vf "scale=${targetWidth}:${targetHeight}"`,
      `-b:v ${bitrate}`,
      `-y`, // Overwrite output file
      `"${tempOutputPath}"`
    ].join(' ');

    // Execute ffmpeg command
    await execAsync(ffmpegCommand);

    // Read optimized video
    const optimizedBuffer = readFileSync(tempOutputPath);
    
    // Log optimization results
    const originalSize = videoBuffer.length;
    const optimizedSize = optimizedBuffer.length;
    const compressionRatio = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);
    
    console.log(`Video optimized: ${originalSize} bytes → ${optimizedSize} bytes (${compressionRatio}% reduction)`);
    
    return optimizedBuffer;

  } catch (error) {
    throw new Error(`Video optimization failed: ${error.message}`);
  } finally {
    // Cleanup
    try {
      if (existsSync(tempInputPath)) {
        unlinkSync(tempInputPath);
      }
      if (existsSync(tempOutputPath)) {
        unlinkSync(tempOutputPath);
      }
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp files:', cleanupError.message);
    }
  }
};

/**
 * Generate video thumbnail
 * @param {Buffer} videoBuffer - Video buffer
 * @param {Object} options - Thumbnail options
 * @returns {Promise<Buffer>} - Thumbnail buffer
 */
export const generateVideoThumbnail = async (videoBuffer, options = {}) => {
  const {
    timestamp = '00:00:01',
    size = '320x240'
  } = options;

  const tempInputPath = path.join(__dirname, '../../temp', `temp_thumb_input_${Date.now()}.mp4`);
  const tempOutputPath = path.join(__dirname, '../../temp', `temp_thumb_output_${Date.now()}.jpg`);
  
  try {
    // Ensure temp directory exists
    const tempDir = path.dirname(tempInputPath);
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    // Write buffer to temp file
    writeFileSync(tempInputPath, videoBuffer);

    // Generate thumbnail using ffmpeg
    const ffmpegCommand = [
      `"${ffmpeg}"`,
      `-i "${tempInputPath}"`,
      `-ss ${timestamp}`,
      `-vframes 1`,
      `-s ${size}`,
      `-y`,
      `"${tempOutputPath}"`
    ].join(' ');

    await execAsync(ffmpegCommand);

    const thumbnailBuffer = readFileSync(tempOutputPath);
    return thumbnailBuffer;

  } catch (error) {
    throw new Error(`Thumbnail generation failed: ${error.message}`);
  } finally {
    // Cleanup
    try {
      if (existsSync(tempInputPath)) {
        unlinkSync(tempInputPath);
      }
      if (existsSync(tempOutputPath)) {
        unlinkSync(tempOutputPath);
      }
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp files:', cleanupError.message);
    }
  }
};

/**
 * Validate video buffer
 * @param {Buffer} buffer - Video buffer
 * @returns {Promise<boolean>} - True if valid video
 */
export const validateVideoBuffer = async (buffer) => {
  try {
    await getVideoMetadata(buffer);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Clean up temp directory
 */
export const cleanupTempDirectory = () => {
  const tempDir = path.join(__dirname, '../../temp');
  try {
    if (existsSync(tempDir)) {
      const files = readdirSync(tempDir);
      files.forEach(file => {
        const filePath = path.join(tempDir, file);
        try {
          unlinkSync(filePath);
        } catch (error) {
          console.warn(`Failed to delete temp file ${file}:`, error.message);
        }
      });
    }
  } catch (error) {
    console.warn('Failed to cleanup temp directory:', error.message);
  }
};

// Auto-cleanup temp directory on module load
cleanupTempDirectory();
