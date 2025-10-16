const { s3, s3Config } = require('../config/s3.config');
const path = require('path');

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File buffer data
 * @param {string} originalName - Original filename
 * @param {string} mimeType - File MIME type
 * @param {string} folder - S3 folder path (e.g., 'dietplans/', 'stories/')
 * @returns {Promise<Object>} - Upload result with S3 URL and key
 */
const uploadToS3 = async (fileBuffer, originalName, mimeType, folder = 'dietplans/') => {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(originalName);
    const fileName = `${folder}${timestamp}-${randomString}${fileExtension}`;

    // S3 upload parameters
    const uploadParams = {
      Bucket: s3Config.bucketName,
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimeType,
      // Removed ACL parameter - bucket should be configured for public access via bucket policy
      Metadata: {
        originalName: originalName,
        uploadDate: new Date().toISOString()
      }
    };

    // Upload to S3
    const result = await s3.upload(uploadParams).promise();

    return {
      success: true,
      url: result.Location,
      key: result.Key,
      bucket: result.Bucket,
      originalName: originalName,
      size: fileBuffer.length,
      uploadDate: new Date()
    };
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

/**
 * Delete file from S3
 * @param {string} fileKey - S3 file key
 * @returns {Promise<Object>} - Delete result
 */
const deleteFromS3 = async (fileKey) => {
  try {
    const deleteParams = {
      Bucket: s3Config.bucketName,
      Key: fileKey
    };

    await s3.deleteObject(deleteParams).promise();

    return {
      success: true,
      message: 'File deleted successfully from S3'
    };
  } catch (error) {
    console.error('S3 Delete Error:', error);
    throw new Error(`Failed to delete file from S3: ${error.message}`);
  }
};

/**
 * Get presigned URL for temporary file access
 * @param {string} fileKey - S3 file key
 * @param {number} expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns {Promise<string>} - Presigned URL
 */
const getPresignedUrl = async (fileKey, expiresIn = 3600) => {
  try {
    const params = {
      Bucket: s3Config.bucketName,
      Key: fileKey,
      Expires: expiresIn
    };

    const url = await s3.getSignedUrlPromise('getObject', params);
    return url;
  } catch (error) {
    console.error('S3 Presigned URL Error:', error);
    throw new Error(`Failed to generate presigned URL: ${error.message}`);
  }
};

/**
 * Check if S3 bucket exists and is accessible
 * @returns {Promise<boolean>} - Bucket accessibility status
 */
const checkBucketAccess = async () => {
  try {
    await s3.headBucket({ Bucket: s3Config.bucketName }).promise();
    return true;
  } catch (error) {
    console.error('S3 Bucket Access Error:', error);
    return false;
  }
};

/**
 * Extract S3 key from S3 URL
 * @param {string} s3Url - Full S3 URL
 * @returns {string} - S3 file key
 */
const extractKeyFromUrl = (s3Url) => {
  try {
    const url = new URL(s3Url);
    // Remove leading slash from pathname
    return url.pathname.substring(1);
  } catch (error) {
    console.error('Error extracting key from URL:', error);
    return null;
  }
};

/**
 * Get file stream from S3
 * @param {string} fileKey - S3 file key
 * @returns {Object} - S3 object stream
 */
const getFileStreamFromS3 = (fileKey) => {
  try {
    const params = {
      Bucket: s3Config.bucketName,
      Key: fileKey
    };

    return s3.getObject(params).createReadStream();
  } catch (error) {
    console.error('S3 Stream Error:', error);
    throw new Error(`Failed to get file stream from S3: ${error.message}`);
  }
};

/**
 * Get file metadata from S3
 * @param {string} fileKey - S3 file key
 * @returns {Promise<Object>} - File metadata
 */
const getFileMetadata = async (fileKey) => {
  try {
    const params = {
      Bucket: s3Config.bucketName,
      Key: fileKey
    };

    const result = await s3.headObject(params).promise();
    return {
      contentType: result.ContentType,
      contentLength: result.ContentLength,
      lastModified: result.LastModified,
      metadata: result.Metadata
    };
  } catch (error) {
    console.error('S3 Metadata Error:', error);
    throw new Error(`Failed to get file metadata from S3: ${error.message}`);
  }
};

module.exports = {
  uploadToS3,
  deleteFromS3,
  getPresignedUrl,
  checkBucketAccess,
  extractKeyFromUrl,
  getFileStreamFromS3,
  getFileMetadata,
  s3Config
};