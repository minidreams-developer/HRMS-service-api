const mongoose = require('mongoose');
const request = require('supertest');
const moment = require('moment');
const httpStatus = require('http-status');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User, Payroll, SalaryDetails } = require('../../src/models');
const payrollService = require('../../src/services/payroll.service');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');

setupTestDB();
const id = () => new mongoose.Types.ObjectId();
const auth = (user) => ({ Authorization: `Bearer ${tokenService.generateToken(user._id, moment().add(30, 'minutes'), tokenTypes.ACCESS)}` });

describe('PAYHUB-02 self payroll and payslip', () => {
  let admin; let employee; let staff; let other; let salary;
  beforeEach(async () => {
    [admin, employee, staff, other] = await User.create([
      { _id: id(), name: 'Admin', employeeId: 'ADM-1', email: `adm-${Date.now()}@x.test`, role: 'admin' },
      { _id: id(), name: 'Employee', employeeId: 'EMP-1', email: `emp-${Date.now()}@x.test`, role: 'employee' },
      { _id: id(), name: 'Staff', employeeId: 'STF-1', email: `stf-${Date.now()}@x.test`, role: 'staff' },
      { _id: id(), name: 'Other', employeeId: 'EMP-2', email: `other-${Date.now()}@x.test`, role: 'employee' },
    ]);
    salary = await SalaryDetails.create({ basicSalary: 30000, monthlyCTC: 30000, pfAmount: 1200, esiAmount: 450 });
    await User.updateMany({ _id: { $in: [employee._id, staff._id, other._id] } }, { 'workInformation.SalaryDetails': salary._id });
  });

  test('auth, self ownership, filters, and management payslip access', async () => {
    await request(app).get('/v1/payroll/me').expect(httpStatus.UNAUTHORIZED);
    const processed = await payrollService.processPayroll(employee._id, 9, 2026, admin._id);
    const otherPayroll = await payrollService.processPayroll(other._id, 9, 2026, admin._id);
    const employeeHeaders = auth(employee);
    const staffHeaders = auth(staff);
    expect((await request(app).get('/v1/payroll/me?month=9&year=2026&status=processed&page=1&limit=1&sortBy=-month').set(employeeHeaders).expect(200)).body.results).toHaveLength(1);
    await request(app).get(`/v1/payroll/me/${processed.payrollId}`).set(employeeHeaders).expect(200);
    await request(app).get(`/v1/payroll/me/${otherPayroll.payrollId}`).set(employeeHeaders).expect(httpStatus.NOT_FOUND);
    await request(app).get('/v1/payroll/me').set(staffHeaders).expect(200);
    await request(app).get(`/v1/payroll/${processed.payrollId}/payslip`).set(auth(admin)).expect(200);
    const pdf = await request(app).get(`/v1/payroll/${processed.payrollId}/payslip/pdf`).set(auth(admin)).expect(200);
    expect(pdf.headers['content-type']).toMatch(/application\/pdf/);
    expect(pdf.headers['content-disposition']).toMatch(/payslip-.*\.pdf/);
    expect(pdf.body.slice(0, 5).toString()).toBe('%PDF-');
    // PDFKit compresses and encodes text streams, so raw bytes are not a
    // reliable text-extraction assertion. Verify a non-empty document with an
    // embedded Unicode font and ToUnicode map instead of accepting a blank PDF.
    expect(pdf.body.length).toBeGreaterThan(10000);
    const pdfSource = pdf.body.toString('latin1');
    expect(pdfSource).toContain('/FontFile2');
    expect(pdfSource).toContain('/ToUnicode');
    await request(app).get(`/v1/payroll/${processed.payrollId}/payslip`).expect(httpStatus.UNAUTHORIZED);
  });

  test('eligibility, snapshot source, paid stability, and deleted-user history', async () => {
    const draft = await Payroll.create({ employeeId: employee._id, month: 8, year: 2026 });
    await request(app).get(`/v1/payroll/${draft._id}/payslip`).set(auth(employee)).expect(httpStatus.CONFLICT);
    const processed = await payrollService.processPayroll(employee._id, 9, 2026, admin._id);
    const before = (await request(app).get(`/v1/payroll/${processed.payrollId}/payslip`).set(auth(employee)).expect(200)).body.payslip;
    expect(before.employee).toMatchObject({ name: 'Employee', employeeCode: 'EMP-1', role: 'employee' });
    expect(before.attendance.overtimeHours).toBe(0);
    await SalaryDetails.updateOne({ _id: salary._id }, { basicSalary: 999999, pfAmount: 999, esiAmount: 999 });
    await User.updateOne({ _id: employee._id }, { name: 'Changed Name', isDeleted: true });
    await payrollService.updatePayrollStatus(processed.payrollId, 'paid', admin._id);
    const after = (await request(app).get(`/v1/payroll/${processed.payrollId}/payslip`).set(auth(admin)).expect(200)).body.payslip;
    expect(after.employee.name).toBe('Employee');
    expect(after.earnings).toEqual(before.earnings);
    expect(after.deductions.pfAmount).toBe(before.deductions.pfAmount);
    expect(after.takeHome).toBe(before.takeHome);
  });
});
