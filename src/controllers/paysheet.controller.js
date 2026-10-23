const httpStatus = require('http-status');
const pick = require('../utils/pick');
const catchAsync = require('../utils/catchAsync');
const { paysheetService } = require('../services');

/**
 * GET /v1/paysheets/dashboard
 * Complete paysheet dashboard with quick stats, payroll overview, and breakdown
 * Query params: month, year, organizationId, refresh
 */
const getDashboard = catchAsync(async (req, res) => {
  const { month, year, organizationId, refresh } = req.query;
  const forceRefresh = refresh === 'true';
  
  const result = await paysheetService.getPaysheetDashboard(month, year, organizationId, forceRefresh);
  res.send(result);
});

/**
 * GET /v1/paysheets/quick-stats
 * Get quick stats only (for cards at the top)
 * Query params: month, year, organizationId
 */
const getQuickStats = catchAsync(async (req, res) => {
  const { month, year, organizationId } = req.query;
  const result = await paysheetService.getQuickStats(month, year, organizationId);
  res.send(result);
});

/**
 * GET /v1/paysheets/payroll-overview
 * Get payroll overview with yearly monthly breakdown (for charts)
 * Query params: year, organizationId
 */
const getPayrollOverview = catchAsync(async (req, res) => {
  const { year, organizationId } = req.query;
  const result = await paysheetService.getPayrollOverview(year, organizationId);
  res.send(result);
});

/**
 * GET /v1/paysheets/payroll-breakdown
 * Get payroll breakdown by categories (for pie chart/bars)
 * Query params: month, year, organizationId
 */
const getPayrollBreakdown = catchAsync(async (req, res) => {
  const { month, year, organizationId } = req.query;
  const result = await paysheetService.getPayrollBreakdown(month, year, organizationId);
  res.send(result);
});

const getAttendanceOverview = catchAsync(async (req, res) => {
  res.send(await paysheetService.getAttendanceOverview(req.query.month, req.query.year));
});

/**
 * POST /v1/paysheets/generate
 * Generate/refresh paysheet data for a specific month/year
 * Body: { month, year, organizationId? }
 */
const generatePaysheet = catchAsync(async (req, res) => {
  const { month, year, organizationId } = req.body;
  const result = await paysheetService.generatePaysheet(month, year, organizationId);
  res.status(httpStatus.CREATED).send(result);
});

/**
 * POST /v1/paysheets/refresh
 * Force refresh paysheet data (recompute from payroll records)
 * Body: { month, year, organizationId? }
 */
const refreshPaysheet = catchAsync(async (req, res) => {
  const { month, year, organizationId } = req.body;
  const result = await paysheetService.refreshPaysheet(month, year, organizationId);
  res.send(result);
});

/**
 * GET /v1/paysheets/list
 * Paginated payroll list table.
 * Query params: month, year, search, status, departmentId, page, limit, sortBy
 */
const getPayrollList = catchAsync(async (req, res) => {
  const query   = pick(req.query, ['month', 'year', 'search', 'status', 'departmentId', 'departmentIds', 'designation', 'designationIds', 'shiftId', 'shiftIds']);
  const options = pick(req.query, ['page', 'limit', 'sortBy']);
  const result  = await paysheetService.getPayrollList(query, options);
  res.send(result);
});

/**
 * GET /v1/paysheets/:payrollId/detail
 * Full detail for a single payroll row.
 */
const getPayrollDetail = catchAsync(async (req, res) => {
  const result = await paysheetService.getPayrollDetail(req.params.payrollId);
  res.send(result);
});

/**
 * PATCH /v1/paysheets/:payrollId/status
 * Update payroll status: paid | pending | cancelled | processed | draft
 * Body: { status }
 */
const updatePayrollStatus = catchAsync(async (req, res) => {
  const result = await paysheetService.updatePayrollStatus(req.params.payrollId, req.body.status, req.user._id);
  res.send(result);
});

module.exports = {
  getDashboard,
  getQuickStats,
  getPayrollOverview,
  getPayrollBreakdown,
  getAttendanceOverview,
  generatePaysheet,
  refreshPaysheet,
  getPayrollList,
  getPayrollDetail,
  updatePayrollStatus,
};
