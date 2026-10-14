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
  const query   = pick(req.query, ['role', 'month', 'year', 'departmentId', 'shiftId', 'branchId', 'designation', 'search', 'status']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result  = await payrollService.getPayrollList(query, options);
  res.send(result);
});

const getPayrollPeriods = catchAsync(async (req, res) => {
  res.send(await payrollService.getPayrollPeriods(req.query.year));
});

const getPayrollAbstractSummary = catchAsync(async (req, res) => {
  res.send(await payrollService.getPayrollAbstractSummary(req.query));
});

const getPayrollAbstractExport = catchAsync(async (req, res) => {
  const data = await payrollService.getPayrollAbstractExport(req.query);
  const rows = data.results || data.data || [data];
  const keys = rows.length ? [...new Set(rows.flatMap((row) => Object.keys(row)))] : ['message'];
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [keys, ...rows.map((row) => keys.map((key) => (typeof row[key] === 'object' ? JSON.stringify(row[key]) : row[key])))].map((row) => row.map(escape).join(',')).join('\n');
  res.type('text/csv').attachment(`payroll-abstract-${req.query.type}-${req.query.year}-${req.query.month}.csv`).send(csv);
});

const finalizePayrollPeriod = catchAsync(async (req, res) => {
  res.send(await payrollService.finalizePayrollPeriod(Number(req.params.year), Number(req.params.month), req.user._id));
});

const getFinalizedPayrollPeriods = catchAsync(async (req, res) => {
  res.send(await payrollService.getFinalizedPayrollPeriods(req.query.year, req.query.search));
});

const getPayrollAbstract = catchAsync(async (req, res) => {
  res.send(await payrollService.getPayrollAbstract(Number(req.params.year), Number(req.params.month)));
});

const getPayslipOptions = catchAsync(async (req, res) => {
  res.send(await payrollService.getPayslipOptions(req.query));
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

const assertPayslipAccess = (user) => {
  const self = selfServiceRoles.has(user.role);
  if (!self && !managementRoles.has(user.role)) throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  return self;
};

const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const payslipRows = (payslip) => [
  ['Field', 'Value'],
  ['Payroll ID', payslip.payrollId], ['Month', `${payslip.month}/${payslip.year}`],
  ['Employee ID', payslip.employee.employeeCode], ['Name', payslip.employee.name],
  ['Role', payslip.employee.role], ['Department', payslip.employee.department],
  ['Designation', payslip.employee.designation], ['Full Days', payslip.attendance.fullDays],
  ['Half Days', payslip.attendance.halfDays], ['Paid Leaves', payslip.attendance.paidLeaves],
  ['Unpaid Leaves', payslip.attendance.unpaidLeaves], ['Overtime Hours', payslip.attendance.overtimeHours],
  ['Gross Wages', payslip.earnings.grossWages], ['Earned Wages', payslip.earnings.earnedWages],
  ['Overtime Amount', payslip.earnings.overtimeAmount], ['Extras', payslip.earnings.extras],
  ['Gross Earnings', payslip.earnings.grossEarnings], ['PF Amount', payslip.deductions.pfAmount],
  ['ESI Amount', payslip.deductions.esiAmount], ['Total Deductions', payslip.deductions.totalDeductions],
  ['Take Home', payslip.takeHome],
];

const getPayslipCsv = catchAsync(async (req, res) => {
  const self = assertPayslipAccess(req.user);
  const { payslip } = await payrollService.getPayslip(req.params.payrollId, self ? req.user._id : null);
  const csv = payslipRows(payslip).map((row) => row.map(csvEscape).join(',')).join('\n');
  res.type('text/csv').attachment(`payslip-${req.params.payrollId}.csv`).send(csv);
});

const getPayslipPdf = catchAsync(async (req, res) => {
  const self = assertPayslipAccess(req.user);
  const { payslip } = await payrollService.getPayslip(req.params.payrollId, self ? req.user._id : null);
  const lines = payslipRows(payslip).map(([key, value]) => `${key}: ${value ?? ''}`);
  const escapePdf = (value) => String(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const content = `BT /F1 10 Tf 50 760 Td ${lines.map((line, i) => `${i ? '0 -16 Td ' : ''}(${escapePdf(line)}) Tj`).join(' ')} ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets[index + 1] = Buffer.byteLength(pdf); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf); pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  res.type('application/pdf').attachment(`payslip-${req.params.payrollId}.pdf`).send(Buffer.from(pdf));
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

const getStopPayrollQuickStats = catchAsync(async (req, res) => {
  res.send(await payrollService.getStopPayrollQuickStats(req.query));
});

const getStopPayrollList = catchAsync(async (req, res) => {
  res.send(await payrollService.getStopPayrollList(req.query, req.query));
});

const getStopPayrollDashboard = catchAsync(async (req, res) => {
  res.send(await payrollService.getStopPayrollDashboard(req.query, req.query));
});

module.exports = {
  getPayrollList,
  getPayrollPeriods,
  getPayrollAbstractSummary,
  getPayrollAbstractExport,
  finalizePayrollPeriod,
  getFinalizedPayrollPeriods,
  getPayrollAbstract,
  getPayslipOptions,
  getEmployeePayroll,
  getMyPayroll,
  getMyPayrollById,
  getPayslip,
  getPayslipCsv,
  getPayslipPdf,
  createPayroll,
  upsertPayroll,
  processPayroll,
  deletePayroll,
  stopPayroll,
  resumePayroll,
  getStoppedPayrolls,
  getStopPayrollQuickStats,
  getStopPayrollList,
  getStopPayrollDashboard,
};
