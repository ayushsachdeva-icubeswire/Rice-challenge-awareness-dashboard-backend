const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directories if they don't exist (for backward compatibility)
const dietplansDir = 'uploads/dietplans';
const storiesDir = 'uploads/stories';

[dietplansDir, storiesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure memory storage for S3 uploads (diet plans)
const dietplanStorage = multer.memoryStorage();

// Configure storage for stories (Images) - keeping disk storage for now
const storyStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, storiesDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'story-' + uniqueName + path.extname(file.originalname));
  }
});

// File filter for PDFs
const pdfFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'), false);
  }
};

// File filter for Images
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure multer for diet plans (PDFs)
const uploadPdfConfig = multer({
  storage: dietplanStorage,
  fileFilter: pdfFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Configure multer for stories (Images)
const uploadImageConfig = multer({
  storage: storyStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for images
  }
});

// Create middleware functions
const uploadPDF = uploadPdfConfig.single('pdfFile');
const upload = uploadImageConfig.single('image');

// Error handling middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: req.file && req.file.fieldname === 'image' 
          ? 'File too large. Maximum size allowed is 5MB.'
          : 'File too large. Maximum size allowed is 10MB.'
      });
    }
    return res.status(400).json({
      message: err.message
    });
  } else if (err) {
    return res.status(400).json({
      message: err.message
    });
  }
  next();
};

module.exports = {
  uploadPDF,
  upload,
  handleUploadError
};