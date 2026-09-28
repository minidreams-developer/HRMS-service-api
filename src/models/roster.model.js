const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const rosterSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
  status: { type: String, enum: ['scheduled', 'cancelled'], default: 'scheduled' },
  notes: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelledAt: Date,
}, { timestamps: true });

rosterSchema.index({ employeeId: 1, date: 1 }, { unique: true, partialFilterExpression: { status: 'scheduled' } });
rosterSchema.plugin(toJSON);
rosterSchema.plugin(paginate);

module.exports = mongoose.model('Roster', rosterSchema);
