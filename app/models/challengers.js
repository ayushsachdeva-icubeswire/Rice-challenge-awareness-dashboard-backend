const mongoose = require("mongoose");

const schema = mongoose.model(
    "challangers",
    new mongoose.Schema({
        name: { type: String, required: true },
        mobile: { type: String, required: true, index: true },
        otp: { type: String, default: "0000" },
        duration: { type: String, default: "7 days" },
        otpVerified: { type: Boolean, default: false },
        isDeleted: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    })
);

module.exports = schema;