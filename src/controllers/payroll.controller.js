const httpStatus = require('http-status');
const pick = require('../utils/pick');
const catchAsync = require('../utils/catchAsync');
const { payrollService } = require('../services');
const { Organization } = require('../models');
const ApiError = require('../utils/ApiError');
const selfServiceRoles = new Set(['employee', 'staff']);
const managementRoles = new Set(['manager', 'hr_manager', 'subAdmin', 'admin']);

/**
 * GET /v1/payroll
 * Paginated payroll listing for a month/year.
 * Query params: month, year, departmentId, shiftId, search, page, limit, sortBy
 */
const getPayrollList = catchAsync(async (req, res) => {
  const query   = pick(req.query, ['employeeId', 'role', 'month', 'year', 'departmentId', 'shiftId', 'branchId', 'designation', 'search', 'status']);
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
  const organization = await Organization.findOne().populate('address').lean();
  const details = payslip.employeeDetails || {};
  const salary = details.workInformation?.SalaryDetails || {};
  const bank = (Array.isArray(details.workInformation?.bankDetails) ? details.workInformation.bankDetails[0] : details.workInformation?.bankDetails) || {};
  const firstAddress = Array.isArray(details.address) ? details.address[0] || {} : details.address || {};
  const value = (item, fallback = 'N/A') => item === undefined || item === null || item === '' ? fallback : item;
  const money = (item) => `₹${Number(item || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const date = (item) => item ? new Date(item).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : 'N/A';
  const scalar = (item) => item && typeof item === 'object' ? (item.designationName || item.departmentName || item.name || item._id) : item;
  const employeeName = value(payslip.employee.name);
  const department = value(scalar(payslip.employee.department));
  const designation = value(scalar(payslip.employee.designation));
  const state = value(firstAddress.state);
  const location = value(details.workInformation?.location);
  const joinedDate = date(details.workInformation?.joinedDate);
  const pfNumber = value(bank.esiAndPf?.pfNumber);
  const esiNumber = value(bank.esiAndPf?.esiNumber);
  const uanNumber = value(bank.esiAndPf?.uanNumber || bank.uanNumber);
  const companyName = value(organization?.companyName, 'Ace Workforce');
  const companySubtitle = organization?.address
    ? [organization.address.addressLine1, organization.address.city, organization.address.state].filter(Boolean).join(', ')
    : 'Workforce Management';
  const esc = (item) => String(item).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[\r\n]/g, ' ');
  const commands = [];
  // Keep text operators inside their own BT/ET block. Graphics operators such
  // as q, rg, re, f, and line paths are invalid inside a text object and can
  // cause PDF viewers to discard all following text.
  const text = (x, y, item, size = 8.5, bold = false, color = '0 0 0') => commands.push(`BT ${color} rg /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${y} Td (${esc(item)}) Tj ET`);
  const line = (y) => commands.push(`0.82 0.86 0.88 RG 0.5 w 42 ${y} m 553 ${y} l S`);
  const section = (y, title) => { line(y + 6); text(42, y - 10, title, 10, true, '0.02 0.42 0.46'); };
  const row = (y, left, right) => { text(42, y, left[0], 7, false, '0.35 0.38 0.4'); text(42, y - 12, value(left[1]), 8.5, true); text(300, y, right[0], 7, false, '0.35 0.38 0.4'); text(300, y - 12, value(right[1]), 8.5, true); };
  commands.push('q 1 1 1 rg 0 0 595 842 re f Q');
  text(42, 804, companyName, 18, true, '0.02 0.20 0.23');
  text(42, 788, companySubtitle || 'Workforce Management', 8.5, false, '0.35 0.38 0.4');
  text(250, 804, 'PAYSLIP', 16, true, '0.02 0.42 0.46');
  text(42, 764, `Payroll period: ${value(payslip.month)}/${value(payslip.year)}`, 8.5, false);
  section(742, 'EMPLOYEE INFORMATION');
  row(720, ['Employee Name', employeeName], ['Employee ID', value(payslip.employee.employeeCode)]);
  row(684, ['Department', department], ['State', state]);
  row(648, ['Date of Joining', joinedDate], ['PF Number', pfNumber]);
  row(612, ['ESI Number', esiNumber], ['Designation', designation]);
  row(576, ['UAN Number', uanNumber], ['Location', location]);
  section(540, 'ATTENDANCE SUMMARY');
  row(518, ['Payroll Status', value(payslip.status)], ['Full Days', value(payslip.attendance.fullDays, 0)]);
  row(482, ['Half Days', value(payslip.attendance.halfDays, 0)], ['Absent Days', value(payslip.attendance.absentDays, 0)]);
  row(446, ['Paid Leaves', value(payslip.attendance.paidLeaves, 0)], ['Unpaid Leaves', value(payslip.attendance.unpaidLeaves, 0)]);
  row(410, ['Overtime Hours', value(payslip.attendance.overtimeHours, 0)], ['Location', location]);
  section(374, 'EARNINGS');
  text(300, 364, 'DEDUCTIONS', 10, true, '0.02 0.42 0.46');
  row(352, ['Gross Wages', money(payslip.earnings.grossWages)], ['Deductions', money(payslip.deductions.deductions)]);
  row(316, ['Earned Wages', money(payslip.earnings.earnedWages)], ['Penalties', money(payslip.deductions.penalties)]);
  row(280, ['Overtime Amount', money(payslip.earnings.overtimeAmount)], ['Loan and Advance', money(payslip.deductions.loanAndAdvance)]);
  row(244, ['Extras', money(payslip.earnings.extras)], ['Other Deductions', money(payslip.deductions.otherDeductions)]);
  row(208, ['Other Wages', money(payslip.earnings.otherWages)], ['PF Amount', money(payslip.deductions.pfAmount)]);
  row(172, ['Gross Earnings', money(payslip.earnings.grossEarnings)], ['ESI Amount', money(payslip.deductions.esiAmount)]);
  row(136, ['Total Earnings', money(payslip.earnings.grossEarnings)], ['Total Deductions', money(payslip.deductions.totalDeductions)]);
  commands.push('0.92 0.95 0.96 rg 42 78 511 38 re f');
  text(56, 96, 'NET PAYABLE', 9, true, '0.02 0.42 0.46');
  text(430, 91, money(payslip.takeHome), 14, true, '0.02 0.42 0.46');
  text(42, 54, `Computer-generated document | Payroll ${value(payslip.month)}/${value(payslip.year)}`, 7, false, '0.4 0.4 0.4');
  const content = commands.join(' ');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
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
  const { month, year, resumeRemarks, resumeDate, resumeReason, adjustArrears, arrearsAmount, payPendingSalary } = req.body;
  const result = await payrollService.resumePayroll(req.params.employeeId, month, year, resumeRemarks, { resumeDate, resumeReason, adjustArrears, arrearsAmount, payPendingSalary }, req.user._id);
  res.status(httpStatus.OK).send(result);
});

const getStopPayrollDetail = catchAsync(async (req, res) => {
  res.send(await payrollService.getStopPayrollDetail(req.params.employeeId, Number(req.query.month), Number(req.query.year)));
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
  getStopPayrollDetail,
  getStoppedPayrolls,
  getStopPayrollQuickStats,
  getStopPayrollList,
  getStopPayrollDashboard,
};
