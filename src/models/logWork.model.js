const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

/**
 * Each row in the Job Items table on the UI.
 * contractorJobItem → Contractor collection (holds job name, unit, base price)
 * pricePerUnit is snapshotted at entry time so historical records stay accurate.
 * total is stored (quantity × pricePerUnit) to avoid recomputing on every read.
 */
const logWorkJobItemSchema = new mongoose.Schema(
  {
    contractorJobItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contractor",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unit: {
      type: String,
      trim: true,
    },
    pricePerUnit: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  { _id: false } // no separate _id per line item
);

const logWorkSchema = new mongoose.Schema(
  {
    // Which contractor this log belongs to
    contractorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Branch where the work was done
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },

    // Date the entry was created in the system
    entryDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // Date the actual work was performed
    workDoneDate: {
      type: Date,
      required: true,
    },

    // Free-text reference / notes
    reference: {
      type: String,
      trim: true,
    },

    // One or more job item line entries
    jobItems: {
      type: [logWorkJobItemSchema],
      default: [],
    },

    // Uploaded file URLs (SVG, PNG, JPG, PDF, DOC — max 10MB handled by frontend/storage)
    attachments: [
      {
        type: String,
        trim: true,
      },
    ],

    // Grand total across all job items (sum of item.total)
    grandTotal: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

logWorkSchema.plugin(toJSON);
logWorkSchema.plugin(paginate);

/**
 * @typedef LogWork
 */
const LogWork = mongoose.model("LogWork", logWorkSchema);

module.exports = LogWork;
