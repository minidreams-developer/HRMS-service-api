const mongoose = require('mongoose');
const request = require('supertest');
const httpStatus = require('http-status');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { Attendance, Holiday, LeaveRequests, Overtime, Shift, User } = require('../../src/models');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');

setupTestDB();

const token = (user) => tokenService.generateToken(user._id, moment().add(1, 'day'), tokenTypes.ACCESS);
const day = (value) => new Date(`${value}T00:00:00.000Z`);

describe('ATTENDANCE-03 employee profile attendance', () => {
  let employee;
  let otherEmployee;
  let admin;
  let shift;

  beforeEach(async () => {
    shift = await Shift.create({ shiftName: 'Profile Shift', weekOff: ['Sunday'] });
    [employee, otherEmployee, admin] = await User.create([
      { _id: new mongoose.Types.ObjectId(), name: 'Profile Employee', email: `profile-${Date.now()}@example.com`, role: 'employee', workInformation: { shiftId: shift._id } },
      { _id: new mongoose.Types.ObjectId(), name: 'Other Employee', email: `other-${Date.now()}@example.com`, role: 'employee' },
      { _id: new mongoose.Types.ObjectId(), name: 'Profile Admin', email: `admin-${Date.now()}@example.com`, role: 'admin' },
    ]);
  });

  const add = (date, category, timingStatus = 'onTime') => Attendance.create({
    employeeId: employee._id, date: day(date), attendanceCategory: category, timingStatus,
  });

  test('lists only the employee with filters, pagination, exact date, and sorting', async () => {
    await add('2026-03-01', 'fullDay');
    await add('2026-03-02', 'halfDay', 'arrivedLate');
    await add('2026-03-03', 'absent');
    await Attendance.create({ employeeId: otherEmployee._id, date: day('2026-03-02'), attendanceCategory: 'fullDay' });

    const response = await request(app)
      .get(`/v1/attendance/employee/${employee._id}`)
      .set('Authorization', `Bearer ${token(employee)}`)
      .query({ fromDate: '2026-03-01', toDate: '2026-03-03', page: 1, limit: 2, sortBy: 'date:asc' })
      .expect(httpStatus.OK);

    expect(response.body).toMatchObject({ page: 1, limit: 2, totalResults: 3, totalPages: 2 });
    expect(response.body.results).toHaveLength(2);
    expect(response.body.results.every((record) => String(record.employeeId) === String(employee._id))).toBe(true);

    const category = await request(app).get(`/v1/attendance/employee/${employee._id}`).set('Authorization', `Bearer ${token(employee)}`).query({ attendanceCategory: 'halfDay' }).expect(200);
    expect(category.body.totalResults).toBe(1);
    const timing = await request(app).get(`/v1/attendance/employee/${employee._id}`).set('Authorization', `Bearer ${token(employee)}`).query({ timingStatus: 'arrivedLate' }).expect(200);
    expect(timing.body.totalResults).toBe(1);
    const exact = await request(app).get(`/v1/attendance/employee/${employee._id}`).set('Authorization', `Bearer ${token(employee)}`).query({ date: '2026-03-02' }).expect(200);
    expect(exact.body.results).toHaveLength(1);
    expect(exact.body.results[0].date).toContain('2026-03-02');
  });

  test('falls back to legacy attendanceStatus as timingStatus', async () => {
    await Attendance.create({ employeeId: employee._id, date: day('2026-03-04'), attendanceCategory: 'fullDay', attendanceStatus: 'earlyOut' });
    const response = await request(app).get(`/v1/attendance/employee/${employee._id}`).set('Authorization', `Bearer ${token(employee)}`).expect(200);
    expect(response.body.results[0].timingStatus).toBe('earlyOut');
  });

  test('returns calendar overlays, precedence, and approved OT independently', async () => {
    await Attendance.create([
      { employeeId: employee._id, date: day('2026-03-01'), attendanceCategory: 'fullDay' },
      { employeeId: employee._id, date: day('2026-03-02'), attendanceCategory: 'fullDay' },
      { employeeId: employee._id, date: day('2026-03-03'), attendanceCategory: 'fullDay' },
      { employeeId: employee._id, date: day('2026-03-04'), attendanceCategory: 'halfDay' },
    ]);
    await LeaveRequests.create({ employeeId: employee._id, singleDate: day('2026-03-03'), status: 'approved' });
    await Holiday.create({ holidayTitle: 'Holiday', date: day('2026-03-02'), status: true, people: [employee._id] });
    await Overtime.create([
      { employeeId: employee._id, OvertimeDate: day('2026-03-04'), totalDuration: 2, status: 'approved' },
      { employeeId: employee._id, OvertimeDate: day('2026-03-05'), totalDuration: 3, status: 'pending' },
    ]);

    const response = await request(app).get(`/v1/attendance/employee/${employee._id}/calendar`).set('Authorization', `Bearer ${token(employee)}`).query({ fromDate: '2026-03-01', toDate: '2026-03-08' }).expect(200);
    const byDate = Object.fromEntries(response.body.map((entry) => [entry.date, entry]));
    expect(byDate['2026-03-01'].category).toBe('dayOff');
    expect(byDate['2026-03-02'].category).toBe('holiday');
    expect(byDate['2026-03-03'].category).toBe('leave');
    expect(byDate['2026-03-04']).toMatchObject({ category: 'halfDay', approvedOvertime: { hours: 2 } });
    expect(byDate['2026-03-05'].approvedOvertime).toBeNull();
  });

  test('enforces self/cross-user authorization and preserves deleted history', async () => {
    await add('2026-03-06', 'fullDay');
    await request(app).get(`/v1/attendance/employee/${employee._id}`).expect(httpStatus.UNAUTHORIZED);
    await request(app).get(`/v1/attendance/employee/${otherEmployee._id}`).set('Authorization', `Bearer ${token(employee)}`).expect(httpStatus.FORBIDDEN);
    await request(app).get(`/v1/attendance/employee/${employee._id}`).set('Authorization', `Bearer ${token(admin)}`).expect(httpStatus.OK);
    await User.updateOne({ _id: employee._id }, { isDeleted: true, deletedAt: new Date() });
    await request(app).get(`/v1/attendance/employee/${employee._id}`).set('Authorization', `Bearer ${token(admin)}`).expect(httpStatus.OK);
    await request(app).get(`/v1/attendance/employee/${employee._id}/calendar`).set('Authorization', `Bearer ${token(admin)}`).query({ fromDate: '2026-03-06', toDate: '2026-03-06' }).expect(httpStatus.OK);
  });

  test('protects the ATTENDANCE-02 summary route', async () => {
    await request(app).get(`/v1/attendance/employee/${employee._id}/summary`).query({ fromDate: '2026-03-01', toDate: '2026-03-01' }).expect(httpStatus.UNAUTHORIZED);
    await request(app).get(`/v1/attendance/employee/${employee._id}/summary`).set('Authorization', `Bearer ${token(employee)}`).query({ fromDate: '2026-03-01', toDate: '2026-03-01' }).expect(httpStatus.OK);
    await request(app).get(`/v1/attendance/employee/${otherEmployee._id}/summary`).set('Authorization', `Bearer ${token(employee)}`).query({ fromDate: '2026-03-01', toDate: '2026-03-01' }).expect(httpStatus.FORBIDDEN);
    await request(app).get(`/v1/attendance/employee/${otherEmployee._id}/summary`).set('Authorization', `Bearer ${token(admin)}`).query({ fromDate: '2026-03-01', toDate: '2026-03-01' }).expect(httpStatus.OK);
  });
});
