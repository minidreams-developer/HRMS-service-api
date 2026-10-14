const mongoose = require('mongoose');
const request = require('supertest');
const moment = require('moment');
const httpStatus = require('http-status');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User, Payroll, Attendance } = require('../../src/models');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');

setupTestDB();
const id = () => new mongoose.Types.ObjectId();
const token = (user) => tokenService.generateToken(user._id, moment().add(30, 'minutes'), tokenTypes.ACCESS);

describe('PAYHUB-PAYSHEET-01 paysheet dashboard APIs', () => {
  let admin; let employee;
  beforeEach(async () => {
    [admin, employee] = await User.create([
      { _id: id(), name: 'Paysheet Admin', email: `paysheet-admin-${Date.now()}@example.com`, role: 'admin', isActive: 'Active' },
      { _id: id(), name: 'Paysheet Employee', employeeId: 'EMP-PS', email: `paysheet-employee-${Date.now()}@example.com`, role: 'employee', isActive: 'Active' },
    ]);
  });

  test('quick stats count processed salary and stopped employees', async () => {
    await Payroll.create([
      { employeeId: employee._id, month: 10, year: 2026, status: 'processed', snapshot: { grossWages: 5000, earnedWages: 4500, takeHome: 4200 }, extras: 100, penalties: 50 },
      { employeeId: employee._id, month: 9, year: 2026, status: 'stopped' },
    ]);
    const response = await request(app).get('/v1/paysheets/quick-stats?month=10&year=2026').set({ Authorization: `Bearer ${token(admin)}` }).expect(httpStatus.OK);
    expect(response.body.quickStats.totalSalary.amount).toBe(5000);
    const hold = await request(app).get('/v1/paysheets/quick-stats?month=9&year=2026').set({ Authorization: `Bearer ${token(admin)}` }).expect(httpStatus.OK);
    expect(hold.body.quickStats.onHoldEmployees.count).toBe(1);
  });

  test('attendance overview reports present and arrived late', async () => {
    await Attendance.create({ employeeId: employee._id, date: '2026-10-06', attendanceCategory: 'fullDay', timingStatus: 'arrivedLate' });
    const response = await request(app).get('/v1/paysheets/attendance-overview?month=10&year=2026').set({ Authorization: `Bearer ${token(admin)}` }).expect(httpStatus.OK);
    expect(response.body.results).toContainEqual({ date: '2026-10-06', present: 1, onLeave: 0, late: 1 });
  });

  test('employee cannot access organization paysheet data', async () => {
    await request(app).get('/v1/paysheets/quick-stats?month=10&year=2026').set({ Authorization: `Bearer ${token(employee)}` }).expect(httpStatus.FORBIDDEN);
  });
});
