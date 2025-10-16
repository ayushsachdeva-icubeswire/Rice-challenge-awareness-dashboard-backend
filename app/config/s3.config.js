const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// Create S3 instance
const s3 = new AWS.S3();

// S3 Configuration
const s3Config = {
  bucketName: process.env.S3_BUCKET_NAME || 'your-bucket-name',
  region: process.env.AWS_REGION || 'us-east-1',
  // Folder structure for different file types
  folders: {
    dietplans: 'dietplans/',
    stories: 'stories/'
  },
  // File size limits
  maxFileSize: {
    pdf: 10 * 1024 * 1024, // 10MB for PDFs
    image: 5 * 1024 * 1024  // 5MB for images
  }
};

module.exports = {
  s3,
  s3Config
};