const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const dayOffSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  reason: { type: String, trim: true },
  status: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deactivatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deactivatedAt: Date,
}, { timestamps: true });

dayOffSchema.index({ employeeId: 1, date: 1 }, { unique: true, partialFilterExpression: { status: true } });
dayOffSchema.plugin(toJSON);
dayOffSchema.plugin(paginate);

module.exports = mongoose.model('DayOff', dayOffSchema);
