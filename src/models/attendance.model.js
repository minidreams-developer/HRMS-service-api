const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  shiftId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shift",
    required: true,
  },
  loginTime: {
    type: Date,
    required: true,
  },
  logoutTime: {
    type: Date,
    required: true,
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
  remarks: {
    type: String,
    trim: true,
  },
});

const Attendance = mongoose.model("Attendance", attendanceSchema);
module.exports = Attendance;
