const mongoose = require("mongoose");

const schema = mongoose.model(
    "challangerProgress",
    new mongoose.Schema({
        name: { type: String, required: true,enum: ['challenge', 'engagement'] },
        currentValue: { type: Number, default: 0 },
        previousValue: { type: Number, default: 0 },
        manualEntries: { type: Number, default: 0 },
        difference: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    })
);

module.exports = schema;