const db = require("../models");
const DietPlan = db.dietplan;
const fs = require('fs');
const path = require('path');
const { uploadToS3, deleteFromS3, extractKeyFromUrl, getFileStreamFromS3, getFileMetadata, s3Config } = require('../services/s3.service');

// Create and Save a new Diet Plan
exports.create = async (req, res) => {
  try {
    // Validate request
    if (!req.body.name || !req.body.duration || !req.body.category) {
      return res.status(400).send({
        message: "Name, duration, and category are required!"
      });
    }

    if (!req.file) {
      return res.status(400).send({
        message: "PDF file is required!"
      });
    }

    // Upload file to S3
    const s3UploadResult = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      s3Config.folders.dietplans
    );

    // Create a Diet Plan
    const dietPlan = new DietPlan({
      name: req.body.name,
      duration: req.body.duration,
      category: req.body.category,
      subcategory: req.body.subcategory || "",
      description: req.body.description || "",
      pdfFile: {
        filename: path.basename(s3UploadResult.key),
        originalName: req.file.originalname,
        s3Url: s3UploadResult.url,
        s3Key: s3UploadResult.key,
        size: req.file.size,
        storageType: 's3',
        uploadDate: new Date()
      },
      createdBy: req.userId, // From JWT middleware
      isActive: req.body.isActive !== undefined ? req.body.isActive : true
    });

    // Save Diet Plan in the database
    const savedDietPlan = await dietPlan.save();
    
    res.status(201).send({
      message: "Diet plan created successfully!",
      data: savedDietPlan
    });
  } catch (err) {
    // If S3 upload was successful but database save failed, clean up S3
    if (req.file && err.s3Key) {
      try {
        await deleteFromS3(err.s3Key);
      } catch (cleanupErr) {
        console.error('Error cleaning up S3 file:', cleanupErr);
      }
    }
    
    res.status(500).send({
      message: err.message || "Some error occurred while creating the Diet Plan."
    });
  }
};

// Retrieve all Diet Plans from the database
exports.findAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.subcategory) filter.subcategory = req.query.subcategory;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    
    const dietPlans = await DietPlan.find(filter)
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await DietPlan.countDocuments(filter);
    
    res.send({
      data: dietPlans,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total
    });
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving diet plans."
    });
  }
};

// Find a single Diet Plan with an id
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;
    
    const dietPlan = await DietPlan.findById(id).populate('createdBy', 'username email');
    
    if (!dietPlan) {
      return res.status(404).send({
        message: "Diet Plan not found with id " + id
      });
    }
    
    res.send({ data: dietPlan });
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(404).send({
        message: "Diet Plan not found with id " + req.params.id
      });
    }
    res.status(500).send({
      message: "Error retrieving Diet Plan with id=" + req.params.id
    });
  }
};

// Update a Diet Plan by the id in the request
exports.update = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).send({
        message: "Data to update can not be empty!"
      });
    }

    const id = req.params.id;
    const updateData = {
      name: req.body.name,
      duration: req.body.duration,
      category: req.body.category,
      subcategory: req.body.subcategory,
      description: req.body.description,
      isActive: req.body.isActive,
      updatedAt: new Date()
    };

    // Handle file update if new file is uploaded
    if (req.file) {
      // Get the old diet plan to delete old file
      const oldDietPlan = await DietPlan.findById(id);
      
      // Upload new file to S3
      const s3UploadResult = await uploadToS3(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        s3Config.folders.dietplans
      );

      // Delete old file from S3 if it exists
      if (oldDietPlan && oldDietPlan.pdfFile.s3Key) {
        try {
          await deleteFromS3(oldDietPlan.pdfFile.s3Key);
        } catch (deleteErr) {
          console.log('Error deleting old S3 file:', deleteErr);
        }
      } else if (oldDietPlan && oldDietPlan.pdfFile.path) {
        // Delete old local file if it exists (backward compatibility)
        try {
          fs.unlinkSync(oldDietPlan.pdfFile.path);
        } catch (fileErr) {
          console.log('Error deleting old local file:', fileErr);
        }
      }

      updateData.pdfFile = {
        filename: path.basename(s3UploadResult.key),
        originalName: req.file.originalname,
        s3Url: s3UploadResult.url,
        s3Key: s3UploadResult.key,
        size: req.file.size,
        storageType: 's3',
        uploadDate: new Date()
      };
    }

    const updatedDietPlan = await DietPlan.findByIdAndUpdate(id, updateData, { 
      new: true,
      runValidators: true 
    }).populate('createdBy', 'username email');

    if (!updatedDietPlan) {
      return res.status(404).send({
        message: `Cannot update Diet Plan with id=${id}. Maybe Diet Plan was not found!`
      });
    }

    res.send({
      message: "Diet Plan was updated successfully.",
      data: updatedDietPlan
    });
  } catch (err) {
    res.status(500).send({
      message: "Error updating Diet Plan with id=" + req.params.id + ". " + err.message
    });
  }
};

// Delete a Diet Plan with the specified id in the request
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Get the diet plan to delete associated file
    const dietPlan = await DietPlan.findById(id);
    if (!dietPlan) {
      return res.status(404).send({
        message: `Cannot delete Diet Plan with id=${id}. Maybe Diet Plan was not found!`
      });
    }

    // Delete the file from S3 or local storage
    if (dietPlan.pdfFile.s3Key) {
      try {
        await deleteFromS3(dietPlan.pdfFile.s3Key);
      } catch (deleteErr) {
        console.log('Error deleting S3 file:', deleteErr);
      }
    } else if (dietPlan.pdfFile.path) {
      // Delete local file (backward compatibility)
      try {
        fs.unlinkSync(dietPlan.pdfFile.path);
      } catch (fileErr) {
        console.log('Error deleting local file:', fileErr);
      }
    }

    await DietPlan.findByIdAndRemove(id);
    
    res.send({
      message: "Diet Plan was deleted successfully!"
    });
  } catch (err) {
    res.status(500).send({
      message: "Could not delete Diet Plan with id=" + id + ". " + err.message
    });
  }
};

// Delete all Diet Plans from the database
exports.deleteAll = async (req, res) => {
  try {
    // Get all diet plans to delete associated files
    const dietPlans = await DietPlan.find({});
    
    // Delete all files from S3 and local storage
    const deletePromises = dietPlans.map(async (dietPlan) => {
      if (dietPlan.pdfFile.s3Key) {
        try {
          await deleteFromS3(dietPlan.pdfFile.s3Key);
        } catch (deleteErr) {
          console.log('Error deleting S3 file:', deleteErr);
        }
      } else if (dietPlan.pdfFile.path) {
        // Delete local file (backward compatibility)
        try {
          fs.unlinkSync(dietPlan.pdfFile.path);
        } catch (fileErr) {
          console.log('Error deleting local file:', fileErr);
        }
      }
    });

    // Wait for all file deletions to complete
    await Promise.all(deletePromises);

    const result = await DietPlan.deleteMany({});
    
    res.send({
      message: `${result.deletedCount} Diet Plans were deleted successfully!`
    });
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while removing all diet plans."
    });
  }
};

// Download PDF file
exports.downloadPDF = async (req, res) => {
  try {
    const id = req.params.id;
    
    const dietPlan = await DietPlan.findById(id);
    
    if (!dietPlan) {
      return res.status(404).send({
        message: "Diet Plan not found with id " + id
      });
    }

    // If file is stored in S3, stream it directly
    if (dietPlan.pdfFile.s3Key) {
      try {
        // Get file metadata for proper headers
        const metadata = await getFileMetadata(dietPlan.pdfFile.s3Key);
        
        // Set appropriate headers
        res.setHeader('Content-Type', metadata.contentType || 'application/pdf');
        res.setHeader('Content-Length', metadata.contentLength);
        res.setHeader('Content-Disposition', `attachment; filename="${dietPlan.pdfFile.originalName}"`);
        res.setHeader('Cache-Control', 'no-cache');
        
        // Create and pipe the S3 stream
        const s3Stream = getFileStreamFromS3(dietPlan.pdfFile.s3Key);
        
        // Handle stream errors
        s3Stream.on('error', (streamErr) => {
          console.error('S3 stream error:', streamErr);
          if (!res.headersSent) {
            res.status(500).send({
              message: "Error streaming file from S3"
            });
          }
        });
        
        // Pipe the stream to response
        s3Stream.pipe(res);
        
      } catch (s3Error) {
        console.error('S3 download error:', s3Error);
        return res.status(500).send({
          message: "Error downloading file from S3: " + s3Error.message
        });
      }
    }
    // If file is stored locally (backward compatibility)
    else if (dietPlan.pdfFile.path) {
      const filePath = dietPlan.pdfFile.path;
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).send({
          message: "PDF file not found"
        });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${dietPlan.pdfFile.originalName}"`);
      
      const fileStream = fs.createReadStream(filePath);
      
      // Handle file stream errors
      fileStream.on('error', (fileErr) => {
        console.error('File stream error:', fileErr);
        if (!res.headersSent) {
          res.status(500).send({
            message: "Error reading local file"
          });
        }
      });
      
      fileStream.pipe(res);
    } else {
      return res.status(404).send({
        message: "PDF file not found"
      });
    }
  } catch (err) {
    console.error('Download error:', err);
    if (!res.headersSent) {
      res.status(500).send({
        message: "Error downloading PDF file: " + err.message
      });
    }
  }
};

// View PDF file inline (without forcing download)
exports.viewPDF = async (req, res) => {
  try {
    const id = req.params.id;
    
    const dietPlan = await DietPlan.findById(id);
    
    if (!dietPlan) {
      return res.status(404).send({
        message: "Diet Plan not found with id " + id
      });
    }

    // If file is stored in S3, stream it directly
    if (dietPlan.pdfFile.s3Key) {
      try {
        // Get file metadata for proper headers
        const metadata = await getFileMetadata(dietPlan.pdfFile.s3Key);
        
        // Set appropriate headers for inline viewing
        res.setHeader('Content-Type', metadata.contentType || 'application/pdf');
        res.setHeader('Content-Length', metadata.contentLength);
        res.setHeader('Content-Disposition', `inline; filename="${dietPlan.pdfFile.originalName}"`);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        
        // Create and pipe the S3 stream
        const s3Stream = getFileStreamFromS3(dietPlan.pdfFile.s3Key);
        
        // Handle stream errors
        s3Stream.on('error', (streamErr) => {
          console.error('S3 stream error:', streamErr);
          if (!res.headersSent) {
            res.status(500).send({
              message: "Error streaming file from S3"
            });
          }
        });
        
        // Pipe the stream to response
        s3Stream.pipe(res);
        
      } catch (s3Error) {
        console.error('S3 view error:', s3Error);
        return res.status(500).send({
          message: "Error viewing file from S3: " + s3Error.message
        });
      }
    }
    // If file is stored locally (backward compatibility)
    else if (dietPlan.pdfFile.path) {
      const filePath = dietPlan.pdfFile.path;
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).send({
          message: "PDF file not found"
        });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${dietPlan.pdfFile.originalName}"`);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      const fileStream = fs.createReadStream(filePath);
      
      // Handle file stream errors
      fileStream.on('error', (fileErr) => {
        console.error('File stream error:', fileErr);
        if (!res.headersSent) {
          res.status(500).send({
            message: "Error reading local file"
          });
        }
      });
      
      fileStream.pipe(res);
    } else {
      return res.status(404).send({
        message: "PDF file not found"
      });
    }
  } catch (err) {
    console.error('View error:', err);
    if (!res.headersSent) {
      res.status(500).send({
        message: "Error viewing PDF file: " + err.message
      });
    }
  }
};