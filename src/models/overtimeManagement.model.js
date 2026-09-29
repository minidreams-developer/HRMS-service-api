const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const overtimeSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    requestedDate: {
        type: Date
    },
    OvertimeDate: {
        type: Date
    },
    startTime: {
        type: Date,
    },
    endTime: {
        type: Date
    },
    totalDuration: {
        type: Number
    },
    source: {
        type: String,
        enum: ['manual', 'attendance'],
        default: 'manual',
    },
    attendanceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Attendance',
    },
    generatedBySystem: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected", "cancelled"],
        default: "pending"
    },
    reason: { type: String, trim: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: Date,
    rejectionReason: { type: String, trim: true },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: Date,
    cancellationReason: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    statusHistory: [{
        status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], required: true },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now },
        reason: { type: String, trim: true },
    }],
}, { timestamps: true });

overtimeSchema.index({ employeeId: 1, startTime: 1, endTime: 1, status: 1 });
overtimeSchema.index(
    { attendanceId: 1 },
    { unique: true, partialFilterExpression: { source: 'attendance', attendanceId: { $exists: true }, status: { $in: ['pending', 'approved'] } } }
);

overtimeSchema.plugin(toJSON);
overtimeSchema.plugin(paginate);

const Overtime = mongoose.model("Overtime", overtimeSchema);
module.exports = Overtime;
