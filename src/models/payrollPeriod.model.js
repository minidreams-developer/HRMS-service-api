const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const payrollPeriodSchema = new mongoose.Schema({
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true, min: 2000, max: 2100 },
  status: { type: String, enum: ['finalized'], default: 'finalized' },
  totalPayout: { type: Number, required: true, min: 0 },
  payrollCount: { type: Number, required: true, min: 0 },
  breakdown: {
    employees: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
    staff: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
    agents: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
    contractors: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
  },
  finalizedAt: { type: Date, required: true },
  finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

payrollPeriodSchema.index({ month: 1, year: 1 }, { unique: true });
payrollPeriodSchema.plugin(toJSON);

module.exports = mongoose.model('PayrollPeriod', payrollPeriodSchema);
