const catchAsync = require('../utils/catchAsync');
const { dashboardService } = require('../services');

/**
 * Extract the common global filters from the request query.
 * All three filter params are optional; absent keys are simply not included.
 */
const extractFilters = (query) => {
  const filters = {};
  if (query.branchId)     filters.branchId     = query.branchId;
  if (query.departmentId) filters.departmentId = query.departmentId;
  if (query.teamId)       filters.teamId       = query.teamId;
  return filters;
};

/**
 * GET /v1/dashboard
 * Full dashboard — quick stats + attendance overview + payroll breakdown in one call.
 * Query params: date, branchId, departmentId, teamId
 */
const getDashboard = catchAsync(async (req, res) => {
  const date    = req.query.date ? new Date(req.query.date) : new Date();
  const filters = extractFilters(req.query);
  const result  = await dashboardService.getDashboard(date, filters, req.query.period || 'today');
  res.send(result);
});

/**
 * GET /v1/dashboard/quick-stats
 * Five stat cards: Total Employees, Present Today, On Leave, OT Employees, Payroll.
 * Query params: date, branchId, departmentId, teamId
 */
const getQuickStats = catchAsync(async (req, res) => {
  const date    = req.query.date ? new Date(req.query.date) : new Date();
  const filters = extractFilters(req.query);
  const result  = await dashboardService.getQuickStats(date, filters);
  res.send(result);
});

/**
 * GET /v1/dashboard/attendance-overview
 * Daily bar chart data — 7-day window of present / on-leave / late counts.
 * Query params: date, branchId, departmentId, teamId
 */
const getAttendanceOverview = catchAsync(async (req, res) => {
  const date    = req.query.date ? new Date(req.query.date) : new Date();
  const filters = extractFilters(req.query);
  const result  = await dashboardService.getAttendanceOverview(date, filters, req.query.period || 'week');
  res.send(result);
});

/**
 * GET /v1/dashboard/payroll-breakdown
 * Category breakdown for the month: salary, allowances, deductions, incentives, overtime.
 * Query params: month, year, branchId, departmentId, teamId
 */
const getPayrollBreakdown = catchAsync(async (req, res) => {
  const month   = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
  const year    = parseInt(req.query.year,  10) || new Date().getFullYear();
  const filters = extractFilters(req.query);
  const result  = await dashboardService.getPayrollBreakdown(month, year, filters, req.query.period || 'month');
  res.send(result);
});

module.exports = {
  getDashboard,
  getQuickStats,
  getAttendanceOverview,
  getPayrollBreakdown,
};
