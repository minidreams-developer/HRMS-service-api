const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const schema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
  effectiveFrom: { type: Date, required: true },
  effectiveTo: { type: Date, default: null },
  isCurrent: { type: Boolean, default: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedAt: { type: Date, default: Date.now },
  reason: { type: String, trim: true },
}, { timestamps: true });
schema.index({ employeeId: 1, effectiveFrom: 1, effectiveTo: 1 });
schema.plugin(toJSON); schema.plugin(paginate);
module.exports = mongoose.model('ShiftAssignment', schema);
