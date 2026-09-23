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
      enum: ["pending", "approved", "rejected", "cancelled", "ended"],
      default: "pending",
    },
    leaveDuration: {
      type: String,
      enum: ["fullDay", "halfDay"],
      default: "fullDay",
    },
    halfDaySession: {
      type: String,
      enum: ["firstHalf", "secondHalf"],
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, default: null },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, trim: true, default: null },
    leaveDays: { type: Number, min: 0, default: 0 },
    balanceUsage: [{
      year: { type: Number, required: true },
      leaveType: { type: String, required: true },
      amount: { type: Number, min: 0, required: true },
    }],
    balanceUsageRecorded: { type: Boolean, default: false },
    statusHistory: [{
      status: { type: String },
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      changedAt: { type: Date, default: Date.now },
      reason: { type: String, trim: true },
    }],
    shiftWeekOffSnapshot: [String],
  },
  { timestamps: true },
);

leaveRequestsSchema.plugin(toJSON);
leaveRequestsSchema.plugin(paginate);

const LeaveRequests = mongoose.model("LeaveRequests", leaveRequestsSchema);
module.exports = LeaveRequests;
