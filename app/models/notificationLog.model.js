const mongoose = require("mongoose");

const NotificationLogSchema = new mongoose.Schema(
  {
    challenger_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Challenger",
      required: true,
    },
    mobile: {
      type: String,
      required: true,
    },
    country_code: {
      type: String,
      required: true,
    },
    duration: {
      type: String,
      required: true,
    },
    duration_actual: {
      type: Number,
      required: true,
    },
    status:{
      type: String,
      required: true, 
      default: 'Sent'
    },
    retry_count: {
      type: Number,
      required: true,
      default: 0
    },
    payload: {
      type: Object,
      required: true,
    },
    response_data: {
      type: Object,
      required: true,
    },
    response_id: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true, // This will add createdAt and updatedAt fields automatically
  }
);

const NotificationLog = mongoose.model(
  "NotificationLog",
  NotificationLogSchema
);
module.exports = NotificationLog;
