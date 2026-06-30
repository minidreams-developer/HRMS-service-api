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
    status: {
        type: String,
        enum: ["pending", "approved"],
        default: "pending"
    },
}, { timestamps: true });

overtimeSchema.plugin(toJSON);
overtimeSchema.plugin(paginate);

const Overtime = mongoose.model("Overtime", overtimeSchema);
module.exports = Overtime;
