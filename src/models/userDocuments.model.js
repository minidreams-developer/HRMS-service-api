const mongoose = require('mongoose');

const userDocumentSchema = new mongoose.Schema({
    documentName: { type: String, default: "unNamed" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    documentType: { type: String, enum: ["government", "personal"], default: "personal" },
    fileUrl: { type: String },
    fileName: { type: String },
    publicId: { type: String },
    mimeType: { type: String },
    keepOriginal: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("UserDocument", userDocumentSchema);