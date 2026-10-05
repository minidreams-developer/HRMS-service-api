const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const breakSchema = new mongoose.Schema({
  breakName: {
    type: String,
    trim: true,
  },
  duration: {
    type: Number, // duration in minutes
  },
  startTime: {
    type: String,
    trim: true,
  },
  endTime: {
    type: String,
    trim: true,
  },
});

const timingSchema = new mongoose.Schema({
  day: {
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
  off: {
    type: Boolean,
    default: false,
  },
});

const rotationSchema = new mongoose.Schema({
  shiftIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Shift' }],
  rotationType: { type: String, enum: ['Weekly'], default: 'Weekly' },
  rotationDuration: { type: Number, min: 1 },
  effectiveStartDate: { type: Date },
}, { _id: false });

const gracePeriodSchema = new mongoose.Schema({
  earlyCheckIn: {
    type: Number,
    default: 0,
  },
  lateCheckIn: {
    type: Number,
    default: 0,
  },
  earlyCheckOut: {
    type: Number,
    default: 0,
  },
  lateCheckOut: {
    type: Number,
    default: 0,
  },
});

const shiftSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.Mixed,
    },
    shiftName: {
      type: String,
      trim: true,
    },
    shiftCode: {
      type: String,
      trim: true,
    },
    
    // Timing Information
    shiftType: {
      type: String,
      default: "Fixed",
    },
    sameTimingForAllDays: {
      type: Boolean,
      default: false,
    },
    timings: {
      type: [timingSchema],
      default: [],
    },
    totalShiftDuration: {
      type: String,
      trim: true,
    },
    minWorkingHours: {
      type: String,
      trim: true,
    },
    halfDayWorkingHours: {
      type: String,
      trim: true,
    },
    overtimeAfterHours: {
      type: Number,
      min: 0.000001,
    },
    rotation: rotationSchema,

    // Advanced Timing Rules
    gracePeriod: {
      type: gracePeriodSchema,
      default: {},
    },

    // Break Management
    breakManagement: {
      enabled: {
        type: Boolean,
        default: false,
      },
      breakType: {
        type: String,
        trim: true,
      },
      duration: {
        type: Number, // Global break duration if applicable
      },
      multipleBreaksSupport: {
        type: Boolean,
        default: false,
      },
      breaks: [breakSchema],
    },

    // Attendance Rules
    attendanceRules: {
      lateMarkAfter: {
        type: Number,
        default: 0,
      },
      autoHalfDayAfterLate: {
        type: Number,
        default: 0,
      },
    },

    // Legacy / Other fields
    weekOff: {
      type: [String],
      default: [],
    },
    compOff: {
      type: [String],
      default: "no",
    },
    isShiftActive: {
      type: Boolean,
      default: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deactivatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deactivatedAt: Date,
  },
  { timestamps: true }
);

shiftSchema.plugin(toJSON);
shiftSchema.plugin(paginate);

const shiftModel = mongoose.model("Shift", shiftSchema);
module.exports = shiftModel;
