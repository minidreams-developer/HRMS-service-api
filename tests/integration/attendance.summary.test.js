const mongoose = require('mongoose');
const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { Attendance, Holiday, LeaveRequests, Overtime, Shift, User } = require('../../src/models');
const attendanceService = require('../../src/services/attendance.service');
const userService = require('../../src/services/user.service');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');
const moment = require('moment');

setupTestDB();

const id = () => new mongoose.Types.ObjectId();
const employeeEmail = () => `summary-${Date.now()}-${Math.random()}@example.com`;

describe('ATTENDANCE-02 employee attendance summary', () => {
  let employee;
  let shift;

  beforeEach(async () => {
    shift = await Shift.create({ shiftName: 'Summary Shift', weekOff: ['Sunday'] });
    employee = await User.create({
      _id: id(),
      name: 'Summary Employee',
      email: employeeEmail(),
      role: 'employee',
      workInformation: { shiftId: shift._id, joinedDate: '2026-02-01' },
    });
  });

  const addAttendance = (date, attendanceCategory) => Attendance.create({
    employeeId: employee._id,
    date,
    attendanceCategory,
  });

  test('counts full day, half day, and explicit absent records', async () => {
    await addAttendance('2026-02-02', 'fullDay');
    await addAttendance('2026-02-03', 'halfDay');
    await addAttendance('2026-02-04', 'absent');

    const summary = await attendanceService.getEmployeeAttendanceSummary(employee._id, '2026-02-01', '2026-02-07');

    expect(summary).toMatchObject({ fullDays: 1, halfDays: 1, absent: 1 });
  });

  test('counts only approved leave dates and avoids duplicate dates', async () => {
    await LeaveRequests.create({ employeeId: employee._id, singleDate: '2026-02-02', leaveType: 'casual', status: 'approved' });
    await LeaveRequests.create({ employeeId: employee._id, singleDate: '2026-02-03', leaveType: 'casual', status: 'pending' });
    await LeaveRequests.create({ employeeId: employee._id, singleDate: '2026-02-04', leaveType: 'casual', status: 'ended' });
    await LeaveRequests.create({ employeeId: employee._id, startDate: '2026-02-02', endDate: '2026-02-03', leaveType: 'casual', status: 'approved' });

    const summary = await attendanceService.getEmployeeAttendanceSummary(employee._id, '2026-02-01', '2026-02-07');

    expect(summary.leaves).toBe(2);
  });

  test('counts active assigned holidays and excludes irrelevant/inactive holidays', async () => {
    await Holiday.create({ holidayTitle: 'Assigned', date: '2026-02-02', status: true, people: [employee._id] });
    await Holiday.create({ holidayTitle: 'Other employee', date: '2026-02-03', status: true, people: [id()] });
    await Holiday.create({ holidayTitle: 'Inactive', date: '2026-02-04', status: false, people: [employee._id] });

    const summary = await attendanceService.getEmployeeAttendanceSummary(employee._id, '2026-02-01', '2026-02-07');

    expect(summary.holidays).toBe(1);
  });

  test('counts week-off dates and excludes holidays from duplicate day categories', async () => {
    await Holiday.create({ holidayTitle: 'Sunday holiday', date: '2026-02-01', status: true, people: [employee._id] });
    const summary = await attendanceService.getEmployeeAttendanceSummary(employee._id, '2026-02-01', '2026-02-07');

    expect(summary.dayOff).toBe(0);
    expect(summary.holidays).toBe(1);
    expect(summary.totalWorkingDays).toBe(6);
  });

  test('uses approved overtime only and returns days plus hours', async () => {
    await Overtime.create({ employeeId: employee._id, OvertimeDate: '2026-02-02', totalDuration: 2, status: 'approved' });
    await Overtime.create({ employeeId: employee._id, OvertimeDate: '2026-02-03', totalDuration: 5, status: 'pending' });

    const summary = await attendanceService.getEmployeeAttendanceSummary(employee._id, '2026-02-01', '2026-02-07');

    expect(summary).toMatchObject({ overtime: 2, overtimeDays: 1, overtimeHours: 2 });
  });

  test('applies holiday, day-off, leave, attendance precedence without double counting', async () => {
    await Holiday.create({ holidayTitle: 'Holiday', date: '2026-02-01', status: true, people: [employee._id] });
    await LeaveRequests.create({ employeeId: employee._id, singleDate: '2026-02-02', leaveType: 'casual', status: 'approved' });
    await addAttendance('2026-02-01', 'fullDay');
    await addAttendance('2026-02-02', 'fullDay');
    await addAttendance('2026-02-03', 'halfDay');

    const summary = await attendanceService.getEmployeeAttendanceSummary(employee._id, '2026-02-01', '2026-02-07');

    expect(summary).toMatchObject({ holidays: 1, leaves: 1, fullDays: 0, halfDays: 1 });
  });

  test('respects requested date range', async () => {
    await addAttendance('2026-01-31', 'fullDay');
    await addAttendance('2026-02-02', 'halfDay');
    await addAttendance('2026-02-08', 'absent');

    const summary = await attendanceService.getEmployeeAttendanceSummary(employee._id, '2026-02-01', '2026-02-07');

    expect(summary).toMatchObject({ fullDays: 0, halfDays: 1, absent: 0 });
  });

  test('keeps historical summary available after employee soft deletion', async () => {
    await addAttendance('2026-02-02', 'fullDay');
    await userService.deleteUserById(employee._id, employee._id);

    const summary = await attendanceService.getEmployeeAttendanceSummary(employee._id, '2026-02-01', '2026-02-07');

    expect(summary.fullDays).toBe(1);
  });

  test('exposes the employee summary endpoint', async () => {
    await addAttendance('2026-02-02', 'fullDay');

    const response = await request(app)
      .get(`/v1/attendance/employee/${employee._id}/summary`)
      .set('Authorization', `Bearer ${tokenService.generateToken(employee._id, moment().add(1, 'day'), tokenTypes.ACCESS)}`)
      .query({ fromDate: '2026-02-01', toDate: '2026-02-07' })
      .expect(httpStatus.OK);

    expect(response.body).toMatchObject({ employeeId: employee._id.toString(), fullDays: 1 });
  });
});
