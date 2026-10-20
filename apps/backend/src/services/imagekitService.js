import ImageKit, { toFile } from '@imagekit/nodejs';
import { UploadService } from './uploadService.js';

/**
 * ImageKit implementation of UploadService interface
 */
export class ImageKitService extends UploadService {
  constructor() {
    super();

    // Hardcoded ImageKit configuration to bypass env variable issues
    const publicKey = 'public_yA8SidcLwvvuQ9QCRnj81kFrLMg=';
    const privateKey = 'private_CRNtVo2/Fa7atiHdeMnsMAEwlxo=';
    const urlEndpoint = 'https://ik.imagekit.io/ohgmcj4v2';

    this.imagekit = new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint
    });

    console.log('✅ ImageKit initialized with hardcoded credentials');
    console.log('🔍 ImageKit instance type:', typeof this.imagekit);
    console.log('🔍 ImageKit prototype:', Object.getPrototypeOf(this.imagekit));
    console.log('🔍 Upload method type:', typeof this.imagekit.upload);
    console.log('🔍 Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.imagekit)));
    console.log('🔍 Own properties:', Object.getOwnPropertyNames(this.imagekit));
  }

  async uploadFile(buffer, filename, folder = '', options = {}) {
    try {
      // Debug buffer
      console.log('🔍 Buffer info:', {
        isBuffer: Buffer.isBuffer(buffer),
        bufferType: typeof buffer,
        bufferLength: buffer ? buffer.length : 'undefined',
        filename: filename
      });

      // For @imagekit/nodejs v7.3.0, use the toFile helper to convert buffer
      const fileObject = await toFile(buffer, filename);
      const uploadOptions = {
        file: fileObject, // Use toFile helper to convert buffer
        fileName: filename,
        folder: folder || 'categories',
        useUniqueFileName: false,
        ...options
      };

      console.log('🔍 Trying to upload with options:', {
        fileName: uploadOptions.fileName,
        folder: uploadOptions.folder,
        fileSize: buffer ? buffer.length : 'undefined'
      });

      // The correct method for v7.3.0
      const response = await this.imagekit.files.upload(uploadOptions);

      console.log('✅ ImageKit upload successful:', response.url);

      return {
        success: true,
        url: response.url,
        fileId: response.fileId,
        fileName: response.name,
        filePath: response.filePath,
        size: response.size,
        fileType: response.fileType,
        mimeType: response.mimeType,
        width: response.width,
        height: response.height,
        metadata: {
          ...response,
          provider: 'imagekit'
        }
      };

    } catch (error) {
      console.error('❌ ImageKit upload failed:', error);
      throw new Error(`Failed to upload file to ImageKit: ${error.message}`);
    }
  }

  /**
   * Delete a file from ImageKit
   * @param {string} fileId - ImageKit file ID
   * @returns {Promise<boolean>} - True if deleted successfully
   */
  async deleteFile(fileId) {
    try {
      await this.imagekit.files.delete(fileId);
      return true;
    } catch (error) {
      console.error('ImageKit delete failed:', error);
      throw new Error(`Failed to delete file from ImageKit: ${error.message}`);
    }
  }

  /**
   * Resolve a file path to an ImageKit file ID
   * ImageKit delete only accepts a fileId, so legacy records that stored just a URL
   * need a path lookup before the file can be removed
   * @param {string} filePath - Path relative to the ImageKit folder root
   * @returns {Promise<string|null>} - ImageKit file ID, or null when not found
   */
  async findFileIdByPath(filePath) {
    if (!filePath) return null;

    const target = filePath.replace(/^\/+/, '');
    const directory = target.includes('/') ? target.slice(0, target.lastIndexOf('/') + 1) : '';
    const fileName = target.slice(directory.length);

    try {
      const response = await this.requestFileList(directory);
      const files = Array.isArray(response) ? response : response?.files ?? response?.data ?? [];

      const match = files.find((file) => {
        const candidate = (file?.filePath ?? file?.name ?? '').replace(/^\/+/, '');
        return candidate === target || (fileName && candidate.endsWith(`/${fileName}`));
      });

      return match?.fileId ?? null;
    } catch (error) {
      console.warn(`ImageKit file lookup unavailable for "${target}":`, error.message);
      return null;
    }
  }

  /**
   * List files in a folder across the SDK shapes this service may run against
   * @param {string} directory - Folder path with a trailing slash
   * @returns {Promise<unknown>} - Raw list response
   */
  async requestFileList(directory) {
    if (typeof this.imagekit.files?.list === 'function') {
      return this.imagekit.files.list({ path: directory, limit: 100 });
    }

    return this.imagekit.get('/files', { path: directory, limit: 100 });
  }

  /**
   * Get file metadata from ImageKit
   * @param {string} fileId - ImageKit file ID
   * @returns {Promise<Object>} - File metadata
   */
  async getFileMetadata(fileId) {
    try {
      const metadata = await this.imagekit.files.getFileDetails(fileId);
      return {
        fileId: metadata.fileId,
        fileName: metadata.name,
        filePath: metadata.filePath,
        url: metadata.url,
        size: metadata.size,
        fileType: metadata.fileType,
        mimeType: metadata.mimeType,
        width: metadata.width,
        height: metadata.height,
        createdAt: metadata.createdAt,
        provider: 'imagekit'
      };
    } catch (error) {
      console.error('ImageKit get file info failed:', error);
      throw new Error(`Failed to get file metadata from ImageKit: ${error.message}`);
    }
  }

  /**
   * Generate a signed URL for temporary access
   * ImageKit URLs are public by default, but we can add transformations
   * @param {string} fileId - ImageKit file ID or path
   * @param {number} expiresIn - URL expiration time in seconds (not used in ImageKit)
   * @param {Object} transformations - Image transformations
   * @returns {Promise<string>} - Transformed URL
   */
  async getSignedUrl(fileId, expiresIn = 3600, transformations = {}) {
    try {
      // ImageKit uses transformation URLs rather than signed URLs
      const path = fileId.startsWith('/') ? fileId.substring(1) : fileId;
      const url = this.imagekit.url({
        path,
        transformation: transformations,
        signed: true,
        expireSeconds: expiresIn
      });

      return url;
    } catch (error) {
      console.error('ImageKit signed URL generation failed:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * List files in a folder
   * @param {string} folder - Folder path
   * @param {Object} options - Pagination and filter options
   * @returns {Promise<Object>} - List of files with pagination info
   */
  async listFiles(folder = '', options = {}) {
    try {
      const { skip = 0, limit = 100, fileType = 'all' } = options;

      const response = await this.imagekit.files.list({
        path: folder,
        skip,
        limit,
        fileType
      });

      return {
        files: response.files.map(file => ({
          fileId: file.fileId,
          fileName: file.name,
          filePath: file.filePath,
          url: file.url,
          size: file.size,
          fileType: file.fileType,
          mimeType: file.mimeType,
          width: file.width,
          height: file.height,
          createdAt: file.createdAt,
          provider: 'imagekit'
        })),
        total: response.files.length,
        skip,
        limit,
        hasNext: response.files.length === limit
      };

    } catch (error) {
      console.error('ImageKit list files failed:', error);
      throw new Error(`Failed to list files from ImageKit: ${error.message}`);
    }
  }

  /**
   * Check if ImageKit is properly configured
   * @returns {Promise<boolean>} - True if service is ready
   */
  async isConfigured() {
    try {
      // Check if ImageKit instance was created successfully
      if (!this.imagekit) {
        return false;
      }

      // Test configuration by trying to list files (limit 0)
      // This will fail if credentials are invalid
      await this.imagekit.listFiles({ limit: 0 });
      return true;

    } catch (error) {
      console.error('ImageKit configuration check failed:', error.message);
      return false;
    }
  }

  /**
   * Get ImageKit authentication parameters for client-side uploads
   * @param {Object} options - Upload options
   * @returns {Object} - Authentication parameters
   */
  getAuthenticationParameters(options = {}) {
    try {
      return this.imagekit.getAuthenticationParameters(options);
    } catch (error) {
      console.error('ImageKit auth parameters failed:', error);
      throw new Error(`Failed to get authentication parameters: ${error.message}`);
    }
  }

  /**
   * Generate ImageKit URL with transformations
   * @param {string} path - Image path or URL
   * @param {Object} transformations - Image transformations
   * @returns {string} - Transformed URL
   */
  getUrl(path, transformations = {}) {
    try {
      return this.imagekit.url({
        path,
        transformation: transformations
      });
    } catch (error) {
      console.error('ImageKit URL generation failed:', error);
      throw new Error(`Failed to generate URL: ${error.message}`);
    }
  }
}
