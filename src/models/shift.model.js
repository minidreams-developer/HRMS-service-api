const mongoose = require("mongoose");

const shiftSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shiftName: {
      type: String,
      trim: true,
    },
    startTime: {
      type: String,
      trim: true,
    },
    endTime: {
      type: String,
      trim: true,
    },
    workingDays: {
      type: [String],
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      default: [],
    },
    weekOff: {
      type: [String],
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      default: [],
    },
    compOff: {
      type: [String],
      enum: ["yes", "no"],
      default: "no",
    },
    isShiftActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

const shiftModel = mongoose.model("Shift", shiftSchema);
module.exports = shiftModel;
