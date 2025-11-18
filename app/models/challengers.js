const mongoose = require("mongoose");

const schema = mongoose.model(
    "challangers",
    new mongoose.Schema({
        name: { type: String, required: true },
        mobile: { type: String, required: true, index: true },
        countryCode: { type: String },
        otp: { type: String, default: "0000" },
        duration: { type: String, default: "7 days" },
        category: { type: String, default: "" },
        subcategory: { type: String, default: "" },
        type: { type: String, default: "" },
        pdf: { type: String, default: "" },
        otpVerified: { type: Boolean, default: false },
        isPartOfBulkUpdate: { type: Boolean, default: false },
        isDummy: { type: Boolean, default: false },
        ip: { type: String, default: "" },
        referer: { type: String, default: "" },
        isDeleted: { type: Boolean, default: false },
        isPrevious: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
        isExtended: { type: Boolean, default: false },
        bulkUpdateDate: { type: Date },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    })
);

module.exports = schema;