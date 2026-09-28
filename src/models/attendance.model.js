const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const attendanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.Mixed,
  },
  date: {
    type: Date,
  },
  // UTC calendar day used for employee/date uniqueness protection.
  attendanceDay: { type: Date },
  shiftId: {
    type: mongoose.Schema.Types.Mixed,
  },
  loginTime: {
    type: Date,
  },
  logoutTime: {
    type: Date,
  },
  IsOverTimeWoked: {
    type: Boolean,
    default: false,
  },
  overTimeWorkedHours: {
    type: Number,
    default: 0,
  },
  totalWorkedHours: {
    type: Number,
    default: 0,
  },
  attendanceCategory: {
    type: String,
    enum: ["fullDay", "halfDay", "absent"],
  },
  timingStatus: {
    type: String,
    enum: ["onTime", "earlyOut", "arrivedLate"],
  },
  attendanceStatus: {
    type: String,
    enum: ["onTime", "earlyOut", "arrivedLate"],
    default: "onTime",
  },
  remarks: {
    type: String,
    trim: true,
  },
  isManualOverride: { type: Boolean, default: false },
  overrideReason: { type: String, trim: true },
  lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastEditedAt: { type: Date },
  editReason: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  creationSource: { type: String, enum: ['manual'], default: undefined },
  createdReason: { type: String, trim: true },
  shiftSnapshot: {
    shiftId: mongoose.Schema.Types.ObjectId,
    shiftName: String,
    shiftCode: String,
    minWorkingHours: String,
    halfDayWorkingHours: String,
    breakEnabled: Boolean,
    breakDuration: Number,
    weekOff: [String],
    timings: [{ day: String, startTime: String, endTime: String, off: Boolean }],
  },
});

attendanceSchema.plugin(toJSON);
attendanceSchema.plugin(paginate);
attendanceSchema.index(
  { employeeId: 1, attendanceDay: 1 },
  { unique: true, partialFilterExpression: { attendanceDay: { $type: 'date' } } },
);

const Attendance = mongoose.model("Attendance", attendanceSchema);
module.exports = Attendance;
