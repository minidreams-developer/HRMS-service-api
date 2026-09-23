const mongoose = require('mongoose');
const request = require('supertest');
const httpStatus = require('http-status');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User, LeaveBalance, LeaveRequests } = require('../../src/models');
const leaveService = require('../../src/services/leaveRequests.service');
const attendanceService = require('../../src/services/attendance.service');
const payrollService = require('../../src/services/payroll.service');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');

setupTestDB();
const id = () => new mongoose.Types.ObjectId();
const token = (user) => tokenService.generateToken(user._id, moment().add(30, 'minutes'), tokenTypes.ACCESS);

describe('LEAVE-05 approved cancellation', () => {
  let employee;
  let other;
  let admin;

  beforeEach(async () => {
    employee = await User.create({ _id: id(), name: 'Cancellation Employee', email: `cancel-${Date.now()}-${Math.random()}@example.com`, role: 'employee' });
    other = await User.create({ _id: id(), name: 'Other Cancellation Employee', email: `other-cancel-${Date.now()}-${Math.random()}@example.com`, role: 'employee' });
    admin = await User.create({ _id: id(), name: 'Cancellation Admin', email: `cancel-admin-${Date.now()}-${Math.random()}@example.com`, role: 'admin' });
    await LeaveBalance.create({ employeeId: employee._id, leaveType: 'Casual Leave', year: 2026, allocated: 5, isPaid: true, requiresBalance: true });
  });

  const approve = async (body = {}) => {
    const leave = await leaveService.createLeaveRequests({ employeeId: employee._id, leaveType: 'Casual Leave', singleDate: '2026-07-06', leaveDuration: 'fullDay', ...body });
    return leaveService.updateLeaveStatus(leave._id, 'approved', admin._id);
  };

  test('restores one full day and records cancellation metadata/history', async () => {
    const leave = await approve();
    expect((await LeaveBalance.findOne({ employeeId: employee._id })).used).toBe(1);
    const cancelled = await leaveService.updateLeaveStatus(leave._id, 'cancelled', employee._id, 'Plans changed');
    const balance = await LeaveBalance.findOne({ employeeId: employee._id });
    expect(balance.used).toBe(0);
    expect(cancelled).toMatchObject({ status: 'cancelled', cancelledBy: employee._id, cancellationReason: 'Plans changed' });
    expect(Array.from(cancelled.statusHistory, (entry) => entry.status)).toEqual(['pending', 'approved', 'cancelled']);
  });

  test('restores half-day by 0.5 and cannot restore twice', async () => {
    const leave = await approve({ singleDate: '2026-07-07', leaveDuration: 'halfDay', halfDaySession: 'firstHalf' });
    await leaveService.updateLeaveStatus(leave._id, 'cancelled', employee._id, 'No longer needed');
    expect((await LeaveBalance.findOne({ employeeId: employee._id })).used).toBe(0);
    await expect(leaveService.updateLeaveStatus(leave._id, 'cancelled', employee._id, 'Retry')).rejects.toThrow('Cannot change');
  });

  test('requires cancellation reason and protects authorization', async () => {
    const leave = await approve({ singleDate: '2026-07-08' });
    await expect(leaveService.updateLeaveStatus(leave._id, 'cancelled', employee._id, '')).rejects.toThrow('cancellationReason');
    await request(app).patch(`/v1/leave-requests/${leave._id}/status`).set('Authorization', `Bearer ${token(other)}`).send({ status: 'cancelled', cancellationReason: 'Not mine' }).expect(httpStatus.FORBIDDEN);
    await request(app).patch(`/v1/leave-requests/${leave._id}/status`).set('Authorization', `Bearer ${token(admin)}`).send({ status: 'cancelled', cancellationReason: 'Admin correction' }).expect(httpStatus.OK);
  });

  test('management can cancel approved leave and rejected leave cannot be cancelled', async () => {
    const leave = await approve({ singleDate: '2026-07-09' });
    const response = await request(app).patch(`/v1/leave-requests/${leave._id}/status`).set('Authorization', `Bearer ${token(admin)}`).send({ status: 'cancelled', cancellationReason: 'Correction' }).expect(httpStatus.OK);
    expect(response.body.status).toBe('cancelled');
    const rejected = await leaveService.createLeaveRequests({ employeeId: employee._id, leaveType: 'Casual Leave', singleDate: '2026-07-10' });
    await leaveService.updateLeaveStatus(rejected._id, 'rejected', admin._id, 'Rejected');
    await expect(leaveService.updateLeaveStatus(rejected._id, 'cancelled', admin._id, 'Cancel')).rejects.toThrow('Cannot change');
  });

  test('unpaid cancellation does not require or change a balance', async () => {
    const leave = await leaveService.createLeaveRequests({ employeeId: employee._id, leaveType: 'Unpaid Leave', singleDate: '2026-07-11' });
    await leaveService.updateLeaveStatus(leave._id, 'approved', admin._id);
    await leaveService.updateLeaveStatus(leave._id, 'cancelled', employee._id, 'Returned to work');
    expect((await LeaveBalance.findOne({ employeeId: employee._id })).used).toBe(0);
  });

  test('restores cross-year usage in each year', async () => {
    await LeaveBalance.create({ employeeId: employee._id, leaveType: 'Casual Leave', year: 2027, allocated: 5, isPaid: true, requiresBalance: true });
    const leave = await leaveService.createLeaveRequests({ employeeId: employee._id, leaveType: 'Casual Leave', startDate: '2026-12-30', endDate: '2027-01-02', leaveDuration: 'fullDay' });
    const approved = await leaveService.updateLeaveStatus(leave._id, 'approved', admin._id);
    expect(Array.from(approved.balanceUsage, (usage) => usage.amount)).toEqual([2, 2]);
    await leaveService.updateLeaveStatus(leave._id, 'cancelled', admin._id, 'Year-end change');
    const balances = await LeaveBalance.find({ employeeId: employee._id }).sort({ year: 1 });
    expect(balances.map((balance) => balance.used)).toEqual([0, 0]);
  });

  test('legacy approved leave without usage metadata is not estimated/restored', async () => {
    const legacy = await LeaveRequests.create({ employeeId: employee._id, leaveType: 'Casual Leave', singleDate: '2026-07-12', status: 'approved', leaveDuration: 'fullDay' });
    await expect(leaveService.updateLeaveStatus(legacy._id, 'cancelled', admin._id, 'Manual review')).rejects.toThrow('no safe balance-usage');
    expect((await LeaveBalance.findOne({ employeeId: employee._id })).used).toBe(0);
  });

  test('cancelled leave is excluded from attendance overlay and payroll', async () => {
    const leave = await approve({ singleDate: '2026-07-13' });
    await leaveService.updateLeaveStatus(leave._id, 'cancelled', employee._id, 'Cancelled');
    const summary = await attendanceService.getEmployeeAttendanceSummary(employee._id, '2026-07-01', '2026-07-31');
    const payroll = await payrollService.computePayrollForEmployee(employee, 7, 2026);
    expect(summary.leaves).toBe(0);
    expect(payroll.paidLeaves).toBe(0);
  });
});
