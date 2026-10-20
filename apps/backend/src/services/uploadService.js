/**
 * Abstract Upload Service Interface
 * This defines the contract that all upload service implementations must follow
 */
export class UploadService {
  /**
   * Upload a file to the storage provider
   * @param {Buffer} buffer - File buffer to upload
   * @param {string} filename - Name for the file
   * @param {string} folder - Folder path (optional)
   * @param {Object} options - Additional options (tags, metadata, etc.)
   * @returns {Promise<Object>} - Upload result with URL and metadata
   */
  async uploadFile(buffer, filename, folder = '', options = {}) {
    throw new Error('uploadFile method must be implemented by subclass');
  }

  /**
   * Delete a file from storage
   * @param {string} fileId - ID or path of the file to delete
   * @returns {Promise<boolean>} - True if deleted successfully
   */
  async deleteFile(fileId) {
    throw new Error('deleteFile method must be implemented by subclass');
  }

  /**
   * Resolve a storable path to the provider's file identifier
   * Providers whose identifier is the path itself (S3 keys, local disk) need no lookup
   * @param {string} filePath - Path of the file relative to the provider root
   * @returns {Promise<string|null>} - Provider file identifier, or null when unresolvable
   */
  async findFileIdByPath(filePath) {
    return filePath || null;
  }

  /**
   * Get file metadata
   * @param {string} fileId - ID or path of the file
   * @returns {Promise<Object>} - File metadata
   */
  async getFileMetadata(fileId) {
    throw new Error('getFileMetadata method must be implemented by subclass');
  }

  /**
   * Generate a signed URL for temporary access
   * @param {string} fileId - ID or path of the file
   * @param {number} expiresIn - URL expiration time in seconds
   * @returns {Promise<string>} - Signed URL
   */
  async getSignedUrl(fileId, expiresIn = 3600) {
    throw new Error('getSignedUrl method must be implemented by subclass');
  }

  /**
   * List files in a folder
   * @param {string} folder - Folder path
   * @param {Object} options - Pagination and filter options
   * @returns {Promise<Object>} - List of files with pagination info
   */
  async listFiles(folder = '', options = {}) {
    throw new Error('listFiles method must be implemented by subclass');
  }

  /**
   * Check if the service is properly configured
   * @returns {Promise<boolean>} - True if service is ready
   */
  async isConfigured() {
    throw new Error('isConfigured method must be implemented by subclass');
  }
}

/**
 * Factory function to get the appropriate upload service
 * @param {string} provider - Storage provider name ('imagekit', 's3', etc.)
 * @returns {UploadService} - Configured upload service instance
 */
export const createUploadService = (provider = 'imagekit') => {
  switch (provider.toLowerCase()) {
    case 'imagekit':
      // Dynamic import to avoid circular dependencies
      return import('./imagekitService.js').then(module => new module.ImageKitService());
    
    case 's3':
    case 'digitalocean':
      return import('./s3Service.js').then(module => new module.S3Service());
    
    default:
      throw new Error(`Unsupported storage provider: ${provider}`);
  }
};

/**
 * Get the default upload service based on environment variables
 * @returns {Promise<UploadService>} - Default upload service
 */
export const getDefaultUploadService = async () => {
  const provider = process.env.STORAGE_PROVIDER || 'imagekit';
  return createUploadService(provider);
};
