const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const leaveBalanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  leaveType: { type: String, required: true, trim: true },
  year: { type: Number, required: true },
  allocated: { type: Number, required: true, min: 0 },
  used: { type: Number, default: 0, min: 0 },
  isPaid: { type: Boolean, default: true },
  requiresBalance: { type: Boolean, default: true },
}, { timestamps: true });

leaveBalanceSchema.index({ employeeId: 1, leaveType: 1, year: 1 }, { unique: true });
leaveBalanceSchema.virtual('remaining').get(function getRemaining() {
  return Math.max(0, this.allocated - this.used);
});
leaveBalanceSchema.set('toJSON', { virtuals: true });
leaveBalanceSchema.plugin(toJSON);
leaveBalanceSchema.plugin(paginate);

module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);
