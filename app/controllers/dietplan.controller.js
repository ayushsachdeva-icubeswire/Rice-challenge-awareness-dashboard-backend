const db = require("../models");
const DietPlan = db.dietplan;
const fs = require('fs');
const path = require('path');

// Create and Save a new Diet Plan
exports.create = async (req, res) => {
  try {
    // Validate request
    if (!req.body.name || !req.body.duration || !req.body.type || !req.body.category) {
      return res.status(400).send({
        message: "Name, duration, type, and category are required!"
      });
    }

    if (!req.file) {
      return res.status(400).send({
        message: "PDF file is required!"
      });
    }

    // Create a Diet Plan
    const dietPlan = new DietPlan({
      name: req.body.name,
      duration: req.body.duration,
      type: req.body.type,
      category: req.body.category,
      subcategory: req.body.subcategory || "",
      description: req.body.description || "",
      pdfFile: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size
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
    if (req.query.type) filter.type = req.query.type;
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
      type: req.body.type,
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
      if (oldDietPlan && oldDietPlan.pdfFile.path) {
        // Delete old file
        try {
          fs.unlinkSync(oldDietPlan.pdfFile.path);
        } catch (fileErr) {
          console.log('Error deleting old file:', fileErr);
        }
      }

      updateData.pdfFile = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
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
      message: "Error updating Diet Plan with id=" + req.params.id
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

    // Delete the PDF file
    if (dietPlan.pdfFile.path) {
      try {
        fs.unlinkSync(dietPlan.pdfFile.path);
      } catch (fileErr) {
        console.log('Error deleting file:', fileErr);
      }
    }

    await DietPlan.findByIdAndRemove(id);
    
    res.send({
      message: "Diet Plan was deleted successfully!"
    });
  } catch (err) {
    res.status(500).send({
      message: "Could not delete Diet Plan with id=" + id
    });
  }
};

// Delete all Diet Plans from the database
exports.deleteAll = async (req, res) => {
  try {
    // Get all diet plans to delete associated files
    const dietPlans = await DietPlan.find({});
    
    // Delete all PDF files
    dietPlans.forEach(dietPlan => {
      if (dietPlan.pdfFile.path) {
        try {
          fs.unlinkSync(dietPlan.pdfFile.path);
        } catch (fileErr) {
          console.log('Error deleting file:', fileErr);
        }
      }
    });

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
    fileStream.pipe(res);
  } catch (err) {
    res.status(500).send({
      message: "Error downloading PDF file"
    });
  }
};