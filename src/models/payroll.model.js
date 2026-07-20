const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

/**
 * Payroll model — stores per-employee, per-month payroll adjustments and computed snapshots.
 * The listing API computes most values on the fly from attendance/leave/overtime/salary data.
 * This model holds any manual overrides (extras, penalties, loan & advance, other deductions,
 * other wages) and caches the final computed values once a payroll period is processed.
 */
const payrollSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Payroll period: month (1–12) and year
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },

    // Manual override / adjustment fields
    extras: {
      type: Number,
      default: 0,
    },
    penalties: {
      type: Number,
      default: 0,
    },
    loanAndAdvance: {
      type: Number,
      default: 0,
    },
    otherDeductions: {
      type: Number,
      default: 0,
    },
    otherWages: {
      type: Number,
      default: 0,
    },
    // New fields from UI
    totalSalary: {
      type: Number,
      default: 0,
    },
    overtimePayment: {
      type: Number,
      default: 0,
    },
    additionPayment: {
      type: Number,
      default: 0,
    },
    deductions: {
      type: Number,
      default: 0,
    },
    totalPayableAmount: {
      type: Number,
      default: 0,
    },

    // Payroll status
    status: {
      type: String,
      enum: ['draft', 'processed', 'paid', 'stopped', 'resumed'],
      default: 'draft',
    },

    // Stop/Resume functionality
    stopDetails: {
      stopType: {
        type: String,
      },
      reason: {
        type: String,
      },
      effectiveFrom: {
        type: Date,
      },
      resumeOn: {
        type: Date, // Optional - when payroll should resume
      },
      impactMonth: {
        type: String, // e.g., "March 2026"
      },
      stopRemarks: {
        type: String,
        trim: true,
      },
      stoppedAt: {
        type: Date,
        default: Date.now,
      },
      resumedAt: {
        type: Date,
      },
    },

    // Snapshot of computed values (populated when status → processed/paid)
    snapshot: {
      fullDays: { type: Number, default: 0 },
      halfDays: { type: Number, default: 0 },
      offDays: { type: Number, default: 0 },
      paidLeaves: { type: Number, default: 0 },
      unpaidLeaves: { type: Number, default: 0 },
      dailyRate: { type: Number, default: 0 },
      grossWages: { type: Number, default: 0 },
      earnedWages: { type: Number, default: 0 },
      overtimeAmount: { type: Number, default: 0 },
      grossEarnings: { type: Number, default: 0 },
      takeHome: { type: Number, default: 0 },
    },

    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Ensure one payroll record per employee per month/year
payrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

payrollSchema.plugin(toJSON);
payrollSchema.plugin(paginate);

const Payroll = mongoose.model('Payroll', payrollSchema);
module.exports = Payroll;
