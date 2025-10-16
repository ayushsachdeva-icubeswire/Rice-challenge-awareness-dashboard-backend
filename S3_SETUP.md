# S3 Setup Instructions for Diet Plan PDF Uploads

This application now supports uploading diet plan PDFs to AWS S3 instead of local storage.

## Prerequisites

1. AWS Account with S3 access
2. S3 bucket created
3. IAM user with S3 permissions

## AWS S3 Configuration

### 1. Create S3 Bucket

1. Go to AWS S3 Console
2. Create a new bucket (e.g., `your-app-dietplans`)
3. **Block Public ACLs**: Keep the default settings (ACLs blocked)
4. Configure bucket policy for public read access (see below)

#### S3 Bucket Policy for Public Read Access

Add this bucket policy to allow public read access to uploaded files:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        }
    ]
}
```

**Important**: Replace `your-bucket-name` with your actual bucket name.

### 2. Create IAM User

1. Go to AWS IAM Console
2. Create a new user with programmatic access
3. Attach the following policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:PutObjectAcl"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name"
        }
    ]
}
```

### 3. Environment Variables

Copy `.env.example` to `.env` and update the following variables:

```env
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket-name
```

## Features

- **Automatic S3 Upload**: All new diet plan PDFs are uploaded to S3
- **Backward Compatibility**: Existing local files continue to work
- **File Management**: Automatic cleanup of old files when updating/deleting
- **Public Access**: Uploaded files are publicly accessible via S3 URLs
- **Error Handling**: Robust error handling with cleanup on failures

## File Structure

```
dietplans/
├── timestamp-randomstring.pdf
└── ...
```

## API Endpoints

All existing diet plan endpoints remain the same with enhanced S3 functionality:

- `POST /api/dietplans` - Create with PDF upload (now uploads to S3)
- `PUT /api/dietplans/:id` - Update with optional PDF upload (uploads to S3)
- `GET /api/dietplans/:id/download` - Download PDF file (streams from S3 with proper headers)
- `GET /api/dietplans/:id/view` - View PDF inline in browser (streams from S3)
- `DELETE /api/dietplans/:id` - Delete diet plan (removes from S3)

### Download Features

1. **Direct Streaming**: Files are streamed directly from S3 without loading into memory
2. **Proper Headers**: Content-Type, Content-Length, and Content-Disposition headers are set correctly
3. **Error Handling**: Robust error handling for stream failures
4. **Backward Compatibility**: Local files continue to work seamlessly
5. **Inline Viewing**: New `/view` endpoint allows PDFs to be displayed in browser
6. **Caching**: Appropriate cache headers for better performance

## Troubleshooting

### Common Issues

1. **"The bucket does not allow ACLs" Error**
   - **Solution**: This is normal for modern S3 buckets with ACLs disabled
   - **Fix**: Use bucket policy instead of ACLs (already implemented in the code)
   - **Bucket Policy**: Apply the public read policy shown above

2. **Upload Failures**: Check AWS credentials and bucket permissions

3. **Access Denied**: Verify IAM user has proper S3 permissions

4. **Bucket Not Found**: Ensure bucket name is correct in environment variables

5. **File Not Accessible**: 
   - Check bucket public access settings
   - Verify bucket policy is applied correctly
   - Ensure bucket policy includes your actual bucket name

6. **CORS Issues** (if accessing from browser):
   ```json
   [
       {
           "AllowedHeaders": ["*"],
           "AllowedMethods": ["GET", "HEAD"],
           "AllowedOrigins": ["*"],
           "ExposeHeaders": []
       }
   ]
   ```

## Migration from Local Storage

Existing diet plans with local file storage will continue to work. New uploads will automatically use S3. To migrate existing files to S3, you can create a migration script or manually re-upload the files.