const mongoose = require("mongoose");

const Challenger = mongoose.model(
  "Challenger",
  new mongoose.Schema(
    {
      name: String,
      mobile: String,
      countryCode: {
        type: String,
        default: "+91",
      },
      duration: String,
      category: String,
      subcategory: String,
      type: String,
      otp: String,
      otpVerified: {
        type: Boolean,
        default: false,
      },
      pdf: String,
      isDeleted: {
        type: Boolean,
        default: false,
      },
      isPrevious: {
        type: Boolean,
        default: false,
      },
      // New fields for reminder tracking
      reminderSent: {
        type: Boolean,
        default: false,
      },
      lastReminderDate: {
        type: Date,
      },
      reminderHistory: [
        {
          sentAt: {
            type: Date,
            required: true,
          },
          duration: {
            type: String,
            required: true,
          },
        },
      ],
      ip: String,
      referer: String,
    },
    {
      timestamps: true,
    }
  )
);

module.exports = Challenger;
