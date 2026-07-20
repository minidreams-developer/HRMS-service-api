const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

/**
 * Adjustment model — captures Additions and Deductions applied to employee payroll.
 *
 * forWhom:     "person" = single employee  |  "team" = all members of a team
 * type:        "addition" | "deduction"
 * component:   Bonus | Incentive | Advance | Penalty | EMI | Other
 *
 * EMI-specific fields (only used when component = "emi"):
 *   affectFrom, affectTo, totalMonths, perMonthDeduction
 *
 * Lifecycle:
 *   draft → pending → approved → applied (applied to payroll)
 *                  ↘ rejected / canceled
 */
const adjustmentSchema = new mongoose.Schema(
  {
    // ── Who this adjustment is for ─────────────────────────────────────────
    forWhom: {
      type: String,
      enum: ['individual', 'team'],
      required: true,
    },

    // Single employee ref (used when forWhom = "person")
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Team ref (used when forWhom = "team")
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },

    // ── Adjustment details ─────────────────────────────────────────────────
    type: {
      type: String,
      enum: ['addition', 'deduction'],
      required: true,
    },

    component: {
      type: String,
      enum: ['bonus', 'incentive', 'advance', 'penalty', 'emi', 'other'],
      required: true,
      lowercase: true,
    },

    // The date this adjustment was created / effective
    date: {
      type: Date,
      required: true,
    },

    // Which payroll month this applies to (1–12)
    payrollMonth: {
      type: Number,
      min: 1,
      max: 12,
      required: true,
    },

    // Which payroll year this applies to
    payrollYear: {
      type: Number,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Whether this adjustment should be automatically applied to payroll
    appliedToPayroll: {
      type: Boolean,
      default: true,
    },

    // ── EMI-specific fields ────────────────────────────────────────────────
    // Only populated when component = "emi"
    emiDetails: {
      affectFrom: {
        month: { type: Number, min: 1, max: 12 },
        year: { type: Number },
      },
      affectTo: {
        month: { type: Number, min: 1, max: 12 },
        year: { type: Number },
      },
      totalMonths: { type: Number, min: 1 },
      perMonthDeduction: { type: Number, min: 0 },
    },

    // ── Status ─────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected', 'canceled', 'applied'],
      default: 'draft',
    },

    // Admin who created this adjustment
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

adjustmentSchema.plugin(toJSON);
adjustmentSchema.plugin(paginate);

/**
 * @typedef Adjustment
 */
const Adjustment = mongoose.model('Adjustment', adjustmentSchema);
module.exports = Adjustment;
