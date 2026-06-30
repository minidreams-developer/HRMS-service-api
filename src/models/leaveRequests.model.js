const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const leaveRequestsSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    leaveType: {
      type: String,
    },
    startDate: {
      type: Date,
    },
    singleDate: {
      type: Date,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    designation: {
      type: String,
    },
    endDate: {
      type: Date,
    },
    reason: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "ended"],
      default: "pending",
    },
  },
  { timestamps: true },
);

leaveRequestsSchema.plugin(toJSON);
leaveRequestsSchema.plugin(paginate);

const LeaveRequests = mongoose.model("LeaveRequests", leaveRequestsSchema);
module.exports = LeaveRequests;
