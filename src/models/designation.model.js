const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const schema = new mongoose.Schema({
  designationName: { type: String, required: true, trim: true },
  designationCode: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  deactivatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deactivatedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
schema.plugin(toJSON); schema.plugin(paginate);
module.exports = mongoose.model('Designation', schema);
