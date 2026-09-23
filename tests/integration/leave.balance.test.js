const mongoose = require('mongoose');
const request = require('supertest');
const httpStatus = require('http-status');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User, LeaveBalance, LeaveRequests } = require('../../src/models');
const leaveBalanceService = require('../../src/services/leaveBalance.service');
const leaveService = require('../../src/services/leaveRequests.service');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');

setupTestDB();

const id = () => new mongoose.Types.ObjectId();
const token = (user) => tokenService.generateToken(user._id, moment().add(30, 'minutes'), tokenTypes.ACCESS);

describe('LEAVE-02 balance management', () => {
  let employee;
  let otherEmployee;
  let admin;

  beforeEach(async () => {
    employee = await User.create({ _id: id(), name: 'Balance Employee', email: `balance-${Date.now()}-${Math.random()}@example.com`, role: 'employee' });
    otherEmployee = await User.create({ _id: id(), name: 'Other Employee', email: `other-${Date.now()}-${Math.random()}@example.com`, role: 'employee' });
    admin = await User.create({ _id: id(), name: 'Balance Admin', email: `balance-admin-${Date.now()}-${Math.random()}@example.com`, role: 'admin' });
  });

  test('admin creates allocation and duplicate employee/type/year is rejected', async () => {
    const body = { employeeId: employee._id, leaveType: 'Casual Leave', year: 2026, allocated: 12, isPaid: true, requiresBalance: true };
    const response = await request(app).post('/v1/leave-balances').set('Authorization', `Bearer ${token(admin)}`).send(body).expect(httpStatus.CREATED);
    expect(response.body).toMatchObject({ leaveType: 'casual leave', allocated: 12, used: 0, remaining: 12 });
    await request(app).post('/v1/leave-balances').set('Authorization', `Bearer ${token(admin)}`).send(body).expect(httpStatus.CONFLICT);
  });

  test('employee cannot create or view another employee balance, but can view own', async () => {
    const balance = await leaveBalanceService.createBalance({ employeeId: employee._id, leaveType: 'Sick Leave', year: 2026, allocated: 5, isPaid: true, requiresBalance: true });
    await request(app).post('/v1/leave-balances').set('Authorization', `Bearer ${token(employee)}`).send({ employeeId: otherEmployee._id, leaveType: 'Sick Leave', year: 2026, allocated: 5, isPaid: true, requiresBalance: true }).expect(httpStatus.FORBIDDEN);
    await request(app).get(`/v1/leave-balances/employee/${employee._id}`).set('Authorization', `Bearer ${token(employee)}`).expect(httpStatus.OK);
    await request(app).get(`/v1/leave-balances/employee/${otherEmployee._id}`).set('Authorization', `Bearer ${token(employee)}`).expect(httpStatus.FORBIDDEN);
    await request(app).get(`/v1/leave-balances/${balance._id}`).set('Authorization', `Bearer ${token(employee)}`).expect(httpStatus.OK);
  });

  test('management can update allocation but cannot reduce below used or change used', async () => {
    const balance = await leaveBalanceService.createBalance({ employeeId: employee._id, leaveType: 'Casual Leave', year: 2026, allocated: 5, isPaid: true, requiresBalance: true });
    balance.used = 2;
    await balance.save();
    await request(app).patch(`/v1/leave-balances/${balance._id}`).set('Authorization', `Bearer ${token(admin)}`).send({ allocated: 1 }).expect(httpStatus.BAD_REQUEST);
    await request(app).patch(`/v1/leave-balances/${balance._id}`).set('Authorization', `Bearer ${token(admin)}`).send({ used: 0 }).expect(httpStatus.BAD_REQUEST);
    const response = await request(app).patch(`/v1/leave-balances/${balance._id}`).set('Authorization', `Bearer ${token(admin)}`).send({ allocated: 4 }).expect(httpStatus.OK);
    expect(response.body.remaining).toBe(2);
  });

  test('approval consumes half-day as 0.5 and uses the correct year balances', async () => {
    await leaveBalanceService.createBalance({ employeeId: employee._id, leaveType: 'Casual Leave', year: 2026, allocated: 2, isPaid: true, requiresBalance: true });
    await leaveBalanceService.createBalance({ employeeId: employee._id, leaveType: 'Casual Leave', year: 2027, allocated: 2, isPaid: true, requiresBalance: true });
    const half = await leaveService.createLeaveRequests({ employeeId: employee._id, leaveType: 'Casual Leave', singleDate: '2026-12-30', leaveDuration: 'halfDay', halfDaySession: 'firstHalf' });
    await leaveService.updateLeaveStatus(half._id, 'approved', admin._id);
    const crossYear = await leaveService.createLeaveRequests({ employeeId: employee._id, leaveType: 'Casual Leave', startDate: '2026-12-31', endDate: '2027-01-02', leaveDuration: 'fullDay' });
    await leaveService.updateLeaveStatus(crossYear._id, 'approved', admin._id);
    const balances = await LeaveBalance.find({ employeeId: employee._id }).sort({ year: 1 });
    expect(balances.map((balance) => balance.used)).toEqual([1.5, 2]);
  });

  test('unpaid leave approves without a configured balance', async () => {
    const leave = await leaveService.createLeaveRequests({ employeeId: employee._id, leaveType: 'Unpaid Leave', singleDate: '2026-04-01', leaveDuration: 'fullDay' });
    const approved = await leaveService.updateLeaveStatus(leave._id, 'approved', admin._id);
    expect(approved.status).toBe('approved');
    expect(await LeaveBalance.countDocuments({ employeeId: employee._id })).toBe(0);
  });
});
