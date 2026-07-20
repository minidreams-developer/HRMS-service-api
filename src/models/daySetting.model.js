const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

/**
 * DaySetting model
 *
 * Two modes driven by the UI:
 *
 * 1. DEFAULT  (type: "default")
 *    Global day start/end times that apply to all employees every day.
 *    Set via the main "Save" button on the Day Settings screen.
 *    Fields used: startTime, endTime
 *
 * 2. SINGLE   (type: "single")
 *    A one-off override for a specific calendar date.
 *    Set via "For one day" → date picker → Confirm.
 *    Fields used: startTime, endTime, date
 *    Note: overrides the default only on that specific date.
 */
const daySettingSchema = new mongoose.Schema(
  {
    // "default" = applies every day globally
    // "single"  = applies only on the specified date
    type: {
      type: String,
      enum: ['default', 'single'],
      required: true,
      default: 'default',
    },

    // Day start time — stored as "HH:mm" string e.g. "08:00"
    startTime: {
      type: String,
      required: true,
      trim: true,
    },

    // Day end time — stored as "HH:mm" string e.g. "18:00"
    endTime: {
      type: String,
      required: true,
      trim: true,
    },

    // Only used when type = "single"
    // The specific calendar date this override applies to
    date: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

daySettingSchema.plugin(toJSON);
daySettingSchema.plugin(paginate);

/**
 * @typedef DaySetting
 */
const DaySetting = mongoose.model('DaySetting', daySettingSchema);

module.exports = DaySetting;
