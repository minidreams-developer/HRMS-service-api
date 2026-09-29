const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const schema = new mongoose.Schema({
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  effectiveFrom: { type: Date, required: true },
  effectiveTo: { type: Date, default: null },
  sharePercentage: { type: Number, required: true, min: 0.000001, max: 100 },
  status: { type: String, enum: ['active', 'ended'], default: 'active' },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedAt: { type: Date, default: Date.now },
  endedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  endedAt: Date,
  reason: { type: String, trim: true },
}, { timestamps: true });

schema.index({ workerId: 1, effectiveFrom: 1, effectiveTo: 1 });
schema.plugin(toJSON); schema.plugin(paginate);
module.exports = mongoose.model('ContractorWorkerAssignment', schema);
