const mongoose = require("mongoose");

const leaveRequestsSchema = new mongoose.schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    leaveType: {
      type: String,
      enum: ["sick", "personal", "compOff"],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    singleDate:{
        type:Date,
    },
    endDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

const LeaveRequests = mongoose.model("LeaveRequests", leaveRequestsSchema);
module.exports = LeaveRequests;
