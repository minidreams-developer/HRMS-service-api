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
const token = (user) => tokenService.generateToken(user._id, moment().add(30, 'minutes'), tokenTypes.ACCESS);
const makeUser = (role, suffix) => ({ _id: id(), name: `${role}-${suffix}`, employeeId: `${role}-${suffix}`, email: `${role}-${suffix}-${Date.now()}@example.com`, role });

describe('PAYHUB-01 payroll workflow', () => {
  let admin; let employee; let salary;
  beforeEach(async () => {
    [admin, employee] = await User.create([makeUser('admin', 'workflow'), makeUser('employee', 'workflow')]);
    salary = await SalaryDetails.create({ basicSalary: 30000, monthlyCTC: 30000, pfAmount: 1200, esiAmount: 450 });
    await User.updateOne({ _id: employee._id }, { 'workInformation.SalaryDetails': salary._id });
  });

  test('protects payroll, paysheet, and salary details management APIs', async () => {
    await request(app).get('/v1/payroll').expect(httpStatus.UNAUTHORIZED);
    await request(app).get('/v1/paysheets/dashboard').expect(httpStatus.UNAUTHORIZED);
    await request(app).get('/v1/salary-details').expect(httpStatus.UNAUTHORIZED);
    const employeeHeaders = { Authorization: `Bearer ${token(employee)}` };
    await request(app).get('/v1/payroll').set(employeeHeaders).expect(httpStatus.FORBIDDEN);
    await request(app).get('/v1/paysheets/dashboard').set(employeeHeaders).expect(httpStatus.FORBIDDEN);
    await request(app).get('/v1/salary-details').set(employeeHeaders).expect(httpStatus.FORBIDDEN);
    const managementHeaders = { Authorization: `Bearer ${token(admin)}` };
    await request(app).get('/v1/payroll').set(managementHeaders).expect(httpStatus.OK);
    await request(app).get('/v1/salary-details').set(managementHeaders).expect(httpStatus.OK);
  });

  test('processes, reprocesses, pays, and locks payroll', async () => {
    const processed = await payrollService.processPayroll(employee._id, 9, 2026, admin._id);
    expect(processed.status).toBe('processed');
    const first = await Payroll.findById(processed.payrollId).lean();
    const reprocessed = await payrollService.processPayroll(employee._id, 9, 2026, admin._id);
    expect(String(reprocessed.payrollId)).toBe(String(first._id));
    await payrollService.updatePayrollStatus(first._id, 'paid', admin._id);
    const paid = await Payroll.findById(first._id).lean();
    expect(paid.paidAt).toBeTruthy();
    await expect(payrollService.processPayroll(employee._id, 9, 2026, admin._id)).rejects.toThrow('Paid payroll cannot be reprocessed');
    await expect(payrollService.upsertPayroll(employee._id, 9, 2026, { extras: 100 })).rejects.toThrow('Paid payroll is immutable');
    await expect(payrollService.deletePayrollById(first._id)).rejects.toThrow('Only draft payroll can be deleted');
  });

  test('rejects invalid status transitions and preserves deleted-user payroll history', async () => {
    const processed = await payrollService.processPayroll(employee._id, 9, 2026, admin._id);
    await expect(payrollService.updatePayrollStatus(processed.payrollId, 'draft', admin._id)).rejects.toThrow("Cannot change payroll status from 'processed' to 'draft'");
    await payrollService.updatePayrollStatus(processed.payrollId, 'paid', admin._id);
    await User.updateOne({ _id: employee._id }, { isDeleted: true });
    const detail = await Payroll.findById(processed.payrollId).lean();
    expect(detail).toBeTruthy();
    await expect(payrollService.processPayroll(employee._id, 10, 2026, admin._id)).rejects.toThrow('Employee not found');
  });
});
