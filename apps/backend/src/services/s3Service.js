import AWS from 'aws-sdk';
import { UploadService } from './uploadService.js';

/**
 * S3/DigitalOcean Spaces implementation of the UploadService interface
 * This is a placeholder implementation ready for DigitalOcean Spaces (S3-compatible)
 */
export class S3Service extends UploadService {
  constructor() {
    super();
    
    // Configure S3 client for DigitalOcean Spaces
    this.s3 = new AWS.S3({
      endpoint: process.env.DO_SPACES_ENDPOINT || process.env.AWS_S3_ENDPOINT,
      accessKeyId: process.env.DO_SPACES_KEY || process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.DO_SPACES_SECRET || process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.DO_SPACES_REGION || process.env.AWS_REGION || 'nyc3'
    });

    this.bucketName = process.env.DO_SPACES_BUCKET || process.env.AWS_S3_BUCKET;
    this.baseUrl = process.env.DO_SPACES_URL || process.env.AWS_S3_URL;
  }

  /**
   * Upload a file to S3/DigitalOcean Spaces
   * @param {Buffer} buffer - File buffer to upload
   * @param {string} filename - Name for the file
   * @param {string} folder - Folder path (optional)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Upload result with URL and metadata
   */
  async uploadFile(buffer, filename, folder = '', options = {}) {
    try {
      const key = folder ? `${folder}/${filename}` : filename;
      
      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: options.contentType || 'application/octet-stream',
        ACL: options.acl || 'public-read',
        Metadata: options.metadata || {}
      };

      const result = await this.s3.upload(uploadParams).promise();

      return {
        success: true,
        url: result.Location,
        fileId: result.Key,
        fileName: filename,
        filePath: result.Key,
        size: buffer.length,
        etag: result.ETag,
        bucket: result.Bucket,
        metadata: {
          ...result,
          provider: 's3'
        }
      };

    } catch (error) {
      console.error('S3 upload failed:', error);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  /**
   * Delete a file from S3/DigitalOcean Spaces
   * @param {string} fileId - S3 object key
   * @returns {Promise<boolean>} - True if deleted successfully
   */
  async deleteFile(fileId) {
    try {
      await this.s3.deleteObject({
        Bucket: this.bucketName,
        Key: fileId
      }).promise();
      
      return true;
    } catch (error) {
      console.error('S3 delete failed:', error);
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
  }

  /**
   * Get file metadata from S3/DigitalOcean Spaces
   * @param {string} fileId - S3 object key
   * @returns {Promise<Object>} - File metadata
   */
  async getFileMetadata(fileId) {
    try {
      const headObject = await this.s3.headObject({
        Bucket: this.bucketName,
        Key: fileId
      }).promise();

      return {
        fileId,
        fileName: fileId.split('/').pop(),
        filePath: fileId,
        url: `${this.baseUrl}/${fileId}`,
        size: headObject.ContentLength,
        contentType: headObject.ContentType,
        lastModified: headObject.LastModified,
        etag: headObject.ETag,
        metadata: headObject.Metadata,
        provider: 's3'
      };

    } catch (error) {
      console.error('S3 get file metadata failed:', error);
      throw new Error(`Failed to get file metadata from S3: ${error.message}`);
    }
  }

  /**
   * Generate a signed URL for temporary access
   * @param {string} fileId - S3 object key
   * @param {number} expiresIn - URL expiration time in seconds
   * @returns {Promise<string>} - Signed URL
   */
  async getSignedUrl(fileId, expiresIn = 3600) {
    try {
      const url = this.s3.getSignedUrl('getObject', {
        Bucket: this.bucketName,
        Key: fileId,
        Expires: expiresIn
      });

      return url;

    } catch (error) {
      console.error('S3 signed URL generation failed:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * List files in a folder
   * @param {string} folder - Folder path (prefix)
   * @param {Object} options - Pagination and filter options
   * @returns {Promise<Object>} - List of files with pagination info
   */
  async listFiles(folder = '', options = {}) {
    try {
      const { maxKeys = 100, continuationToken } = options;
      
      const listParams = {
        Bucket: this.bucketName,
        Prefix: folder,
        MaxKeys: maxKeys
      };

      if (continuationToken) {
        listParams.ContinuationToken = continuationToken;
      }

      const result = await this.s3.listObjectsV2(listParams).promise();

      const files = result.Contents.map(object => ({
        fileId: object.Key,
        fileName: object.Key.split('/').pop(),
        filePath: object.Key,
        url: `${this.baseUrl}/${object.Key}`,
        size: object.Size,
        lastModified: object.LastModified,
        etag: object.ETag,
        provider: 's3'
      }));

      return {
        files,
        total: result.KeyCount,
        isTruncated: result.IsTruncated,
        nextContinuationToken: result.NextContinuationToken,
        maxKeys
      };

    } catch (error) {
      console.error('S3 list files failed:', error);
      throw new Error(`Failed to list files from S3: ${error.message}`);
    }
  }

  /**
   * Check if S3/DigitalOcean Spaces is properly configured
   * @returns {Promise<boolean>} - True if service is ready
   */
  async isConfigured() {
    try {
      if (!this.bucketName || !this.s3.config.accessKeyId || !this.s3.config.secretAccessKey) {
        return false;
      }

      // Test configuration by trying to list objects (limit 1)
      await this.s3.listObjectsV2({
        Bucket: this.bucketName,
        MaxKeys: 1
      }).promise();

      return true;

    } catch (error) {
      console.error('S3 configuration check failed:', error);
      return false;
    }
  }

  /**
   * Generate a presigned URL for direct upload (client-side upload)
   * @param {string} filename - Name for the file
   * @param {string} folder - Folder path (optional)
   * @param {string} contentType - MIME type
   * @param {number} expiresIn - URL expiration time in seconds
   * @returns {Promise<Object>} - Presigned upload URL and fields
   */
  async getPresignedUploadUrl(filename, folder = '', contentType = 'application/octet-stream', expiresIn = 3600) {
    try {
      const key = folder ? `${folder}/${filename}` : filename;
      
      const s3Params = {
        Bucket: this.bucketName,
        Key: key,
        Expires: expiresIn,
        ContentType: contentType,
        ACL: 'public-read'
      };

      const uploadUrl = this.s3.getSignedUrl('putObject', s3Params);

      return {
        uploadUrl,
        key,
        bucket: this.bucketName,
        url: `${this.baseUrl}/${key}`
      };

    } catch (error) {
      console.error('S3 presigned URL generation failed:', error);
      throw new Error(`Failed to generate presigned upload URL: ${error.message}`);
    }
  }

  /**
   * Copy an object within S3
   * @param {string} sourceKey - Source object key
   * @param {string} destinationKey - Destination object key
   * @returns {Promise<Object>} - Copy result
   */
  async copyFile(sourceKey, destinationKey) {
    try {
      const copyParams = {
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${sourceKey}`,
        Key: destinationKey
      };

      const result = await this.s3.copyObject(copyParams).promise();

      return {
        success: true,
        fileId: destinationKey,
        copySourceVersionId: result.CopySourceVersionId,
        versionId: result.VersionId,
        provider: 's3'
      };

    } catch (error) {
      console.error('S3 copy failed:', error);
      throw new Error(`Failed to copy file in S3: ${error.message}`);
    }
  }
}
