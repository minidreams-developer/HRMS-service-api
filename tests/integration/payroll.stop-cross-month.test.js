const mongoose = require('mongoose');
const moment = require('moment');
const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const { User, Payroll } = require('../../src/models');
const setupTestDB = require('../utils/setupTestDB');
const payrollService = require('../../src/services/payroll.service');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');

setupTestDB();
const id = () => new mongoose.Types.ObjectId();

describe('PAYHUB-STOP-PAYROLL-CROSSMONTH-01', () => {
  test('keeps stopped September and normal October payroll independent', async () => {
    const [admin, employee] = await User.create([
      { _id: id(), name: 'Cross Month Admin', email: `cross-admin-${Date.now()}@example.com`, role: 'admin', isActive: 'Active' },
      { _id: id(), name: 'Cross Month Employee', employeeId: 'EMP-CROSS', email: `cross-employee-${Date.now()}@example.com`, role: 'employee', isActive: 'Active' },
    ]);
    const september = await payrollService.processPayroll(employee._id, 9, 2026, admin._id);
    await payrollService.stopPayroll(employee._id, { month: 9, year: 2026, stopType: 'hold', reason: 'Review', effectiveFrom: '2026-09-20', impactMonth: 'September 2026' });
    const authToken = tokenService.generateToken(admin._id, moment().add(30, 'minutes'), tokenTypes.ACCESS);
    const stats = await request(app).get('/v1/payroll/stop/quick-stats?month=9&year=2026').set({ Authorization: `Bearer ${authToken}` }).expect(httpStatus.OK);
    expect(stats.body).toMatchObject({ stoppedPayrolls: 1, releasedPayrolls: 0 });
    const october = await payrollService.processPayroll(employee._id, 10, 2026, admin._id);
    expect(String(september.payrollId)).not.toBe(String(october.payrollId));

    const octoberBefore = await Payroll.findById(october.payrollId).lean();
    const septemberStopped = await Payroll.findOne({ employeeId: employee._id, month: 9, year: 2026 });
    expect(septemberStopped.status).toBe('stopped');
    expect(septemberStopped.stopDetails.reason).toBe('Review');

    await payrollService.resumePayroll(employee._id, 9, 2026, 'Released in October');
    await payrollService.updatePayrollStatus(september.payrollId, 'processed', admin._id);
    await payrollService.updatePayrollStatus(september.payrollId, 'paid', admin._id);
    await payrollService.updatePayrollStatus(october.payrollId, 'paid', admin._id);

    const [septemberPaid, octoberPaid] = await Promise.all([
      Payroll.findById(september.payrollId).lean(), Payroll.findById(october.payrollId).lean(),
    ]);
    expect(septemberPaid).toMatchObject({ month: 9, year: 2026, status: 'paid' });
    expect(octoberPaid).toMatchObject({ month: 10, year: 2026, status: 'paid' });
    expect(octoberPaid.snapshot).toEqual(octoberBefore.snapshot);
    expect(septemberPaid.snapshot.takeHome).toBe(septemberStopped.snapshot.takeHome);
    expect(await Payroll.countDocuments({ employeeId: employee._id })).toBe(2);
    expect(await payrollService.getPayslip(september.payrollId)).toMatchObject({ payslip: { month: 9, year: 2026 } });
    expect(await payrollService.getPayslip(october.payrollId)).toMatchObject({ payslip: { month: 10, year: 2026 } });
  });
});
