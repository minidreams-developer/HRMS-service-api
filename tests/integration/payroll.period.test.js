const mongoose = require('mongoose');
const request = require('supertest');
const moment = require('moment');
const httpStatus = require('http-status');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User, SalaryDetails, Payroll, PayrollPeriod, Attendance } = require('../../src/models');
const payrollService = require('../../src/services/payroll.service');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');

setupTestDB();

const id = () => new mongoose.Types.ObjectId();
const token = (user) => tokenService.generateToken(user._id, moment().add(30, 'minutes'), tokenTypes.ACCESS);
const makeUser = (role, suffix) => ({
  _id: id(), name: `${role}-${suffix}`, employeeId: `${role}-${suffix}`,
  email: `${role}-${suffix}-${Date.now()}@example.com`, role, isActive: 'Active', isDeleted: false,
});

describe('PAYHUB-PERIOD-01 payroll periods', () => {
  let admin; let employee; let salary;

  beforeEach(async () => {
    [admin, employee] = await User.create([makeUser('admin', 'period'), makeUser('employee', 'period')]);
    salary = await SalaryDetails.create({ basicSalary: 30000, monthlyCTC: 30000 });
    await User.updateOne({ _id: employee._id }, { 'workInformation.SalaryDetails': salary._id });
  });

  test('returns live current month and pending previous month', async () => {
    const now = new Date();
    const currentMonth = now.getUTCMonth() + 1;
    const year = now.getUTCFullYear();
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? year - 1 : year;
    await Payroll.create({ employeeId: employee._id, month: previousMonth, year: previousYear, totalPayableAmount: 1000 });

    const response = await request(app).get(`/v1/payroll/periods?year=${year}`).set({ Authorization: `Bearer ${token(admin)}` }).expect(httpStatus.OK);
    const current = response.body.data.find((period) => period.month === currentMonth);
    expect(current).toMatchObject({ status: 'live', payoutType: 'estimated' });
    if (previousYear === year) {
      const previous = response.body.data.find((period) => period.month === previousMonth);
      expect(previous).toMatchObject({ status: 'pendingFinalization', payoutType: 'draft' });
    }
  });

  test('finalizes a month, keeps its payout stable, and is idempotent', async () => {
    const year = 2026; const month = 9;
    await Payroll.create({ employeeId: employee._id, month, year, status: 'draft' });
    await Attendance.create({ employeeId: employee._id, date: '2026-09-10', attendanceDay: '2026-09-10', attendanceCategory: 'fullDay', timingStatus: 'onTime' });
    const first = await request(app).post(`/v1/payroll/periods/${year}/${month}/finalize`).set({ Authorization: `Bearer ${token(admin)}` }).expect(httpStatus.OK);
    expect(first.body).toMatchObject({ month, year, status: 'finalized' });
    const payout = first.body.totalPayout;
    expect(payout).toBeGreaterThan(0);

    await User.updateOne({ _id: employee._id }, { 'workInformation.SalaryDetails': id() });
    const listed = await payrollService.getPayrollPeriods(year);
    expect(listed.data.find((period) => period.month === month)).toMatchObject({ status: 'finalized', payout, payoutType: 'final' });
    const history = await request(app).get(`/v1/payroll/periods/finalized?year=${year}&search=September`).set({ Authorization: `Bearer ${token(admin)}` }).expect(httpStatus.OK);
    expect(history.body.data).toHaveLength(1);
    expect(history.body.data[0]).toMatchObject({ month, totalPayout: payout, netPayout: payout });
    const abstract = await request(app).get(`/v1/payroll/periods/${year}/${month}/abstract`).set({ Authorization: `Bearer ${token(admin)}` }).expect(httpStatus.OK);
    expect(abstract.body.totalPayout).toBe(payout);

    const second = await request(app).post(`/v1/payroll/periods/${year}/${month}/finalize`).set({ Authorization: `Bearer ${token(admin)}` }).expect(httpStatus.OK);
    expect(String(second.body.id || second.body._id)).toBe(String(first.body.id || first.body._id));
    expect(await PayrollPeriod.countDocuments({ year, month })).toBe(1);
  });

  test('enforces authorization and rejects future finalization', async () => {
    await request(app).get('/v1/payroll/periods').expect(httpStatus.UNAUTHORIZED);
    await request(app).get('/v1/payroll/periods').set({ Authorization: `Bearer ${token(employee)}` }).expect(httpStatus.FORBIDDEN);
    const future = new Date();
    future.setUTCMonth(future.getUTCMonth() + 2);
    await request(app).post(`/v1/payroll/periods/${future.getUTCFullYear()}/${future.getUTCMonth() + 1}/finalize`).set({ Authorization: `Bearer ${token(admin)}` }).expect(httpStatus.BAD_REQUEST);
  });

  test('year filter excludes periods from another year', async () => {
    await PayrollPeriod.create({ month: 1, year: 2025, totalPayout: 500, payrollCount: 1, finalizedAt: new Date(), finalizedBy: admin._id });
    const response = await request(app).get('/v1/payroll/periods?year=2026').set({ Authorization: `Bearer ${token(admin)}` }).expect(httpStatus.OK);
    expect(response.body.data.every((period) => period.year === 2026)).toBe(true);
  });
});
