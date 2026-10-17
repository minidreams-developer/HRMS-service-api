const httpStatus = require('http-status');
const fs = require('fs');
// Explicit entry point keeps compatibility with the project's older Jest resolver.
const PDFDocument = require('pdfkit/js/pdfkit');
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
  const money = (item) => item === undefined || item === null || item === '' ? 'N/A' : `₹${Number(item).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  const fontCandidates = [process.env.PAYSLIP_FONT_PATH, '/System/Library/Fonts/Supplemental/Arial Unicode.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'].filter(Boolean);
  const unicodeFont = fontCandidates.find((font) => fs.existsSync(font));
  const doc = new PDFDocument({ size: 'A4', margin: 42, bufferPages: true });
  res.type('application/pdf').attachment(`payslip-${req.params.payrollId}.pdf`);
  if (unicodeFont) doc.font(unicodeFont);
  const teal = '#087681'; const muted = '#687277'; const divider = '#d9e0e2';
  const label = (x, y, title, item, width = 120) => { doc.fillColor(muted).fontSize(7).text(title, x, y, { width }); doc.fillColor('#10282b').fontSize(8.5).text(value(item), x, y + 11, { width }); };
  const section = (y, title) => { doc.strokeColor(divider).moveTo(42, y).lineTo(553, y).stroke(); doc.fillColor(teal).fontSize(10).text(title, 42, y + 8); };
  const grid = (y, values, columns = 4) => { const width = 511 / columns; values.forEach((item, index) => label(42 + (index % columns) * width, y + Math.floor(index / columns) * 34, item[0], item[1], width - 12)); };
  doc.fillColor('#10282b').fontSize(18).text(companyName, 42, 42);
  doc.fillColor(muted).fontSize(8.5).text(companySubtitle || 'Workforce Management', 42, 64);
  doc.fillColor(teal).fontSize(17).text('PAYSLIP', 250, 48, { width: 120, align: 'center' });
  doc.fillColor(muted).fontSize(8).text(`Payroll period: ${value(payslip.month)}/${value(payslip.year)}`, 42, 88);
  section(108, 'EMPLOYEE INFORMATION');
  grid(126, [['Employee Name', employeeName], ['Employee ID', payslip.employee.employeeCode], ['Department', department], ['State', state], ['Date of Joining', joinedDate], ['PF Number', pfNumber], ['ESI Number', esiNumber], ['Working Days', payslip.attendance.workingDays], ['Designation', designation], ['UAN Number', uanNumber]]);
  section(226, 'ATTENDANCE SUMMARY');
  grid(244, [['Payroll Status', payslip.status], ['Full Days', payslip.attendance.fullDays], ['Half Days', payslip.attendance.halfDays], ['Absent Days', payslip.attendance.absentDays], ['Paid Leaves', payslip.attendance.paidLeaves], ['Unpaid Leaves', payslip.attendance.unpaidLeaves], ['Overtime Hours', payslip.attendance.overtimeHours], ['Location', location]]);
  section(326, 'EARNINGS');
  doc.fillColor(teal).fontSize(10).text('DEDUCTIONS', 310, 334);
  const earnings = [['Gross Wages', payslip.earnings.grossWages], ['Earned Wages', payslip.earnings.earnedWages], ['Overtime Amount', payslip.earnings.overtimeAmount], ['Extras', payslip.earnings.extras], ['Other Wages', payslip.earnings.otherWages], ['Gross Earnings', payslip.earnings.grossEarnings]];
  const deductions = [['Deductions', payslip.deductions.deductions], ['Penalties', payslip.deductions.penalties], ['Loan and Advance', payslip.deductions.loanAndAdvance], ['Other Deductions', payslip.deductions.otherDeductions], ['PF Amount', payslip.deductions.pfAmount], ['ESI Amount', payslip.deductions.esiAmount]];
  earnings.forEach((item, index) => { const y = 354 + index * 24; doc.fillColor(muted).fontSize(8).text(item[0], 42, y); doc.fillColor('#10282b').fontSize(8).text(money(item[1]), 180, y, { width: 90, align: 'right' }); });
  deductions.forEach((item, index) => { const y = 354 + index * 24; doc.fillColor(muted).fontSize(8).text(item[0], 310, y); doc.fillColor('#10282b').fontSize(8).text(money(item[1]), 448, y, { width: 90, align: 'right' }); });
  doc.strokeColor(divider).moveTo(42, 506).lineTo(553, 506).stroke();
  doc.fillColor('#10282b').fontSize(8.5).text('Gross Earnings', 42, 516); doc.text(money(payslip.earnings.grossEarnings), 180, 516, { width: 90, align: 'right' });
  doc.text('Total Deductions', 310, 516); doc.text(money(payslip.deductions.totalDeductions), 448, 516, { width: 90, align: 'right' });
  doc.roundedRect(42, 560, 511, 54, 6).fill('#eef3f4');
  doc.fillColor(teal).fontSize(10).text('NET PAYABLE', 58, 580); doc.fontSize(15).text(money(payslip.takeHome), 300, 577, { width: 150, align: 'right' });
  doc.fillColor(muted).fontSize(8).text(`${value(payslip.month)}/${value(payslip.year)}`, 465, 584, { width: 70, align: 'right' });
  doc.fillColor(muted).fontSize(7).text('Computer-generated document; no signature required.', 42, 780);
  doc.pipe(res); doc.end();
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
