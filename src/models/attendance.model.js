const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const attendanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.Mixed,
  },
  date: {
    type: Date,
  },
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
  attendanceStatus: {
    type: String,
    enum: ["onTime", "earlyOut", "arrivedLate"],
    default: "onTime",
  },
  remarks: {
    type: String,
    trim: true,
  },
});

attendanceSchema.plugin(toJSON);
attendanceSchema.plugin(paginate);

const Attendance = mongoose.model("Attendance", attendanceSchema);
module.exports = Attendance;
