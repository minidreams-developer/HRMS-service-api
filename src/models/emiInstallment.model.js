const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const emiInstallmentSchema = new mongoose.Schema({
  parentAdjustmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Adjustment', required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: Number, min: 1, max: 12, required: true },
  year: { type: Number, required: true },
  installmentNumber: { type: Number, min: 1, required: true },
  installmentAmount: { type: Number, min: 0, required: true },
  status: { type: String, enum: ['pending', 'applied', 'cancelled'], default: 'pending' },
  payrollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll' },
  appliedAt: Date,
  cancelledAt: Date,
}, { timestamps: true });
emiInstallmentSchema.index({ parentAdjustmentId: 1, installmentNumber: 1 }, { unique: true });
emiInstallmentSchema.plugin(toJSON);
module.exports = mongoose.model('EmiInstallment', emiInstallmentSchema);
