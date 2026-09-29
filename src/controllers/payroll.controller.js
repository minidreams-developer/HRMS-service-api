const httpStatus = require('http-status');
const pick = require('../utils/pick');
const catchAsync = require('../utils/catchAsync');
const { payrollService } = require('../services');
const ApiError = require('../utils/ApiError');
const selfServiceRoles = new Set(['employee', 'staff']);
const managementRoles = new Set(['manager', 'hr_manager', 'subAdmin', 'admin']);

/**
 * GET /v1/payroll
 * Paginated payroll listing for a month/year.
 * Query params: month, year, departmentId, shiftId, search, page, limit, sortBy
 */
const getPayrollList = catchAsync(async (req, res) => {
  const query   = pick(req.query, ['month', 'year', 'departmentId', 'shiftId', 'branchId', 'search', 'status']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result  = await payrollService.getPayrollList(query, options);
  res.send(result);
});

/**
 * GET /v1/payroll/:employeeId/preview
 * Detailed payroll breakdown for a single employee.
 * Query params: month, year
 */
const getEmployeePayroll = catchAsync(async (req, res) => {
  const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
  const year  = parseInt(req.query.year,  10) || new Date().getFullYear();
  const result = await payrollService.getEmployeePayroll(req.params.employeeId, month, year);
  res.send(result);
});

const assertSelfServiceRole = (user) => {
  if (!selfServiceRoles.has(user.role)) throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
};

const getMyPayroll = catchAsync(async (req, res) => {
  assertSelfServiceRole(req.user);
  res.send(await payrollService.getPayrollHistoryForUser(req.user._id, req.query, req.query));
});

const getMyPayrollById = catchAsync(async (req, res) => {
  assertSelfServiceRole(req.user);
  res.send(await payrollService.getPayrollForUser(req.user._id, req.params.payrollId));
});

const getPayslip = catchAsync(async (req, res) => {
  const self = selfServiceRoles.has(req.user.role);
  if (!self && !managementRoles.has(req.user.role)) throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  res.send(await payrollService.getPayslip(req.params.payrollId, self ? req.user._id : null));
});

/**
 * PUT /v1/payroll/:employeeId
 * Upsert manual adjustments (extras, penalties, loanAndAdvance, otherDeductions, otherWages, remarks).
 * Body must include month and year.
 */
const upsertPayroll = catchAsync(async (req, res) => {
  const { month, year, ...body } = req.body;
  body.updatedBy = req.user._id;
  const result = await payrollService.upsertPayroll(req.params.employeeId, month, year, body);
  res.send(result);
});

/**
 * POST /v1/payroll/:employeeId/process
 * Lock and snapshot payroll for an employee for the given month/year.
 * Body: { month, year }
 */
const processPayroll = catchAsync(async (req, res) => {
  const { month, year } = req.body;
  const result = await payrollService.processPayroll(req.params.employeeId, month, year, req.user._id);
  res.status(httpStatus.OK).send(result);
});

/**
 * DELETE /v1/payroll/:payrollId
 * Remove a payroll override record.
 */
const deletePayroll = catchAsync(async (req, res) => {
  await payrollService.deletePayrollById(req.params.payrollId);
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * POST /v1/payroll/:employeeId/stop
 * Stop payroll for an employee.
 * Body: { month, year, stopType, reason, effectiveFrom, resumeOn?, impactMonth, stopRemarks? }
 */
const stopPayroll = catchAsync(async (req, res) => {
  const result = await payrollService.stopPayroll(req.params.employeeId, req.body);
  res.status(httpStatus.OK).send(result);
});

/**
 * POST /v1/payroll/:employeeId/resume
 * Resume payroll for an employee.
 * Body: { month, year, resumeRemarks? }
 */
const resumePayroll = catchAsync(async (req, res) => {
  const { month, year, resumeRemarks } = req.body;
  const result = await payrollService.resumePayroll(req.params.employeeId, month, year, resumeRemarks);
  res.status(httpStatus.OK).send(result);
});

/**
 * GET /v1/payroll/stopped
 * Get all stopped payrolls with optional filters.
 * Query params: month, year, stopType, reason, page, limit
 */
const createPayroll = catchAsync(async (req, res) => {
  const payroll = await payrollService.createPayroll(req.body, req.user._id);
  res.status(httpStatus.CREATED).send(payroll);
});

const getStoppedPayrolls = catchAsync(async (req, res) => {
  const query = pick(req.query, ['month', 'year', 'stopType', 'reason']);
  const options = pick(req.query, ['page', 'limit']);
  const result = await payrollService.getStoppedPayrolls(query, options);
  res.send(result);
});

module.exports = {
  getPayrollList,
  getEmployeePayroll,
  getMyPayroll,
  getMyPayrollById,
  getPayslip,
  createPayroll,
  upsertPayroll,
  processPayroll,
  deletePayroll,
  stopPayroll,
  resumePayroll,
  getStoppedPayrolls,
};
