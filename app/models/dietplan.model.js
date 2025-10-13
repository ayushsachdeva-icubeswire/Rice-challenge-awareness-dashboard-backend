const mongoose = require("mongoose");

const DietPlan = mongoose.model(
  "DietPlan",
  new mongoose.Schema({
    name: {
      type: String,
      required: true,
      trim: true
    },
    duration: {
      type: String,
      required: true,
      trim: true // e.g., "7 days", "1 month", "3 months"
    },
    type: {
      type: String,
      required: true,
      trim: true // e.g., "Weight Loss", "Weight Gain", "Maintenance", "Muscle Building"
    },
    category: {
      type: String,
      required: true,
      trim: true // e.g., "Vegetarian", "Vegan", "Keto", "Mediterranean", "High Protein"
    },
    subcategory: {
      type: String,
      required: false,
      trim: true // e.g., "Low Carb", "High Fiber", "Gluten Free", "Dairy Free", "Beginner Friendly"
    },
    pdfFile: {
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
        required: true
      },
      size: {
        type: Number,
        required: true
      },
      uploadDate: {
        type: Date,
        default: Date.now
      }
    },
    description: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
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

module.exports = DietPlan;