const mongoose = require("mongoose");

const Story = mongoose.model(
  "Story",
  new mongoose.Schema({
    handle: String,
    influencer:{
        id: String,
        fullName: String,
        profilePicUrl: String,
        followerCount: Number,
        gender:String,
        engagementRate: Number
    },
    storyLink: String,
    imageUrl: String,
    views:Number,
    likes: Number,
    storyFile: {
      type: {
        filename: {
          type: String,
          required: true
        },
        originalName: {
          type: String,
          required: true
        },
        path: {
          type: String,
          required: false // Made optional for backward compatibility
        },
        s3Url: {
          type: String,
          required: false // S3 URL for the uploaded file
        },
        s3Key: {
          type: String,
          required: false // S3 key for file operations
        },
        size: {
          type: Number,
          required: true
        },
        uploadDate: {
          type: Date,
          default: Date.now
        },
        storageType: {
          type: String,
          enum: ['local', 's3'],
          default: 's3' // Default to S3 storage
        }
      },
      required: false // Make the entire pdfFile object optional
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  })
);

module.exports = Story;