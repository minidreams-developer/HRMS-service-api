const catchAsync = require('../utils/catchAsync');
const { dashboardService } = require('../services');

/**
 * GET /v1/dashboard
 * Full dashboard — quick stats + attendance overview + payroll breakdown in one call.
 * Query params: date (ISO string, defaults to today)
 */
const getDashboard = catchAsync(async (req, res) => {
  const date = req.query.date ? new Date(req.query.date) : new Date();
  const result = await dashboardService.getDashboard(date);
  res.send(result);
});

/**
 * GET /v1/dashboard/quick-stats
 * Five stat cards: Total Employees, Present Today, On Leave, OT Employees, Payroll.
 * Query params: date (ISO string, defaults to today)
 */
const getQuickStats = catchAsync(async (req, res) => {
  const date = req.query.date ? new Date(req.query.date) : new Date();
  const result = await dashboardService.getQuickStats(date);
  res.send(result);
});

/**
 * GET /v1/dashboard/attendance-overview
 * Daily bar chart data — 7-day window of present / on-leave / late counts.
 * Query params: date (ISO string — last day of the window, defaults to today)
 */
const getAttendanceOverview = catchAsync(async (req, res) => {
  const date = req.query.date ? new Date(req.query.date) : new Date();
  const result = await dashboardService.getAttendanceOverview(date);
  res.send(result);
});

/**
 * GET /v1/dashboard/payroll-breakdown
 * Category breakdown for the month: salary, allowances, deductions, incentives, overtime.
 * Query params: month (1-12), year (e.g. 2026)
 */
const getPayrollBreakdown = catchAsync(async (req, res) => {
  const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
  const year  = parseInt(req.query.year,  10) || new Date().getFullYear();
  const result = await dashboardService.getPayrollBreakdown(month, year);
  res.send(result);
});

module.exports = {
  getDashboard,
  getQuickStats,
  getAttendanceOverview,
  getPayrollBreakdown,
};
