const mongoose = require("mongoose");

const WebhookLogsSchema = new mongoose.Schema({
  message_id: {
    type: String,
    required: true,
    index: true,
  },
  status: {
    type: String,
    required: true,
  },
  response_data: {
    type: Object,
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const WebhookLogs = mongoose.model("WebhookLogs", WebhookLogsSchema);
module.exports = WebhookLogs;
