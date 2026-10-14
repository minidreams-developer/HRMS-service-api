const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const roleIdReservationSchema = new mongoose.Schema({
  roleId: { type: String, required: true, unique: true },
  reservationTokenHash: { type: String, required: true, unique: true },
  reservedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  status: { type: String, enum: ['reserved', 'consumed', 'expired'], default: 'reserved' },
  consumedAt: { type: Date },
});

roleIdReservationSchema.plugin(toJSON);

module.exports = mongoose.model('RoleIdReservation', roleIdReservationSchema);
