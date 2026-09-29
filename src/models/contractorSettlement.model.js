const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const workerItem = new mongoose.Schema({
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  payrollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll', required: true },
  workerSnapshot: { id: mongoose.Schema.Types.ObjectId, employeeCode: String, name: String, role: String, branch: mongoose.Schema.Types.Mixed, department: mongoose.Schema.Types.Mixed },
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContractorWorkerAssignment', required: true },
  salaryBasis: { type: String, enum: ['earnedWages'], required: true },
  salaryAmount: { type: Number, required: true, min: 0 },
  sharePercentage: { type: Number, required: true, min: 0, max: 100 },
  calculatedShare: { type: Number, required: true, min: 0 },
}, { _id: false });

const schema = new mongoose.Schema({
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  workerItems: { type: [workerItem], default: [] },
  skippedWorkers: [{ workerId: mongoose.Schema.Types.ObjectId, reason: String }],
  totalShare: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['draft', 'processed', 'paid'], default: 'draft' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, processedAt: Date,
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, paidAt: Date,
  remarks: { type: String, trim: true },
}, { timestamps: true });
schema.index({ contractorId: 1, month: 1, year: 1 }, { unique: true });
schema.plugin(toJSON); schema.plugin(paginate);
module.exports = mongoose.model('ContractorSettlement', schema);
