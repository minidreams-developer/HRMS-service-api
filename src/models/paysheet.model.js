const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

/**
 * Paysheet model — stores aggregated payroll statistics and dashboard data.
 * This model captures monthly/yearly payroll summaries for dashboard analytics.
 */
const paysheetSchema = new mongoose.Schema(
  {
    // Time period
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100,
    },

    // Organization context (optional for multi-tenant)
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },

    // Quick Stats
    quickStats: {
      totalSalary: {
        amount: { type: Number, default: 0 },
        percentageChange: { type: Number, default: 0 }, // vs previous month
      },
      totalIncentive: {
        amount: { type: Number, default: 0 },
        percentageChange: { type: Number, default: 0 },
      },
      totalDeductions: {
        amount: { type: Number, default: 0 },
        percentageChange: { type: Number, default: 0 },
      },
      payableEmployees: {
        count: { type: Number, default: 0 },
        percentageChange: { type: Number, default: 0 },
      },
      onHoldEmployees: {
        count: { type: Number, default: 0 },
        percentageChange: { type: Number, default: 0 },
      },
    },

    // Payroll Overview (monthly breakdown for charts)
    payrollOverview: {
      totalPayThisMonth: { type: Number, default: 0 },
      
      // Monthly data points for the year
      monthlyData: [{
        month: { type: String }, // "Jan", "Feb", etc.
        salary: { type: Number, default: 0 },
        overtime: { type: Number, default: 0 },
        incentives: { type: Number, default: 0 },
      }],
    },

    // Payroll Breakdown (detailed categories)
    payrollBreakdown: {
      totalPayThisMonth: { type: Number, default: 0 },
      
      categories: {
        salary: {
          amount: { type: Number, default: 0 },
          percentage: { type: Number, default: 0 },
        },
        allowances: {
          amount: { type: Number, default: 0 },
          percentage: { type: Number, default: 0 },
        },
        deductions: {
          amount: { type: Number, default: 0 },
          percentage: { type: Number, default: 0 },
        },
        incentives: {
          amount: { type: Number, default: 0 },
          percentage: { type: Number, default: 0 },
        },
        overtime: {
          amount: { type: Number, default: 0 },
          percentage: { type: Number, default: 0 },
        },
      },
    },

    // Computed metadata
    computedAt: {
      type: Date,
      default: Date.now,
    },
    
    // Data sources tracking
    dataSource: {
      employeeCount: { type: Number, default: 0 },
      processedPayrolls: { type: Number, default: 0 },
      lastPayrollUpdate: { type: Date },
    },
  },
  { timestamps: true }
);

// Ensure one paysheet record per month/year/organization
paysheetSchema.index({ month: 1, year: 1, organizationId: 1 }, { unique: true });
paysheetSchema.index({ year: 1, organizationId: 1 }); // For yearly queries

paysheetSchema.plugin(toJSON);
paysheetSchema.plugin(paginate);

const Paysheet = mongoose.model('Paysheet', paysheetSchema);
module.exports = Paysheet;