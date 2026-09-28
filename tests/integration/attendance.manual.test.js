const mongoose = require('mongoose');
const request = require('supertest');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');
const { User, Shift, Attendance } = require('../../src/models');
setupTestDB();
const id = () => new mongoose.Types.ObjectId();
const auth = (user) => ({ Authorization: `Bearer ${tokenService.generateToken(user._id, moment().add(1, 'day'), tokenTypes.ACCESS)}` });

describe('MANUAL-ATTENDANCE-01', () => {
  let employee; let admin; let shift;
  beforeEach(async () => {
    [employee, admin] = await User.create([
      { _id: id(), name: 'Manual Employee', email: `manual-${Date.now()}@example.com`, role: 'employee' },
      { _id: id(), name: 'Manual Admin', email: `manual-admin-${Date.now()}@example.com`, role: 'admin' },
    ]);
    shift = await Shift.create({ shiftName: 'Manual Shift', minWorkingHours: '8h', halfDayWorkingHours: '4h', isShiftActive: true });
  });
  const post = (user, body) => request(app).post('/v1/attendance').set(auth(user)).send(body);
  const times = (date, login, logout) => ({ loginTime: `${date}T${login}:00Z`, logoutTime: `${date}T${logout}:00Z` });

  test('requires management authentication and records manual audit metadata', async () => {
    await request(app).post('/v1/attendance').send({ employeeId: employee._id, date: '2026-09-24', createdReason: 'x' }).expect(401);
    await post(employee, { employeeId: employee._id, date: '2026-09-24', attendanceCategory: 'absent' }).expect(403);
    const response = await post(admin, { employeeId: employee._id, date: '2026-09-24', shiftId: shift._id, attendanceCategory: 'absent', createdReason: 'Manual correction', createdBy: employee._id }).expect(201);
    const saved = await Attendance.findById(response.body.id);
    expect(String(saved.createdBy)).toBe(String(admin._id));
    expect(saved.creationSource).toBe('manual');
    expect(saved.createdReason).toBe('Manual correction');
    expect(saved.totalWorkedHours).toBe(0);
  });

  test('rejects missing/soft-deleted employees and inactive explicit Shifts', async () => {
    await post(admin, { employeeId: id(), date: '2026-09-24', attendanceCategory: 'absent' }).expect(404);
    await employee.updateOne({ isDeleted: true });
    await post(admin, { employeeId: employee._id, date: '2026-09-24', attendanceCategory: 'absent' }).expect(404);
    await employee.updateOne({ isDeleted: false });
    await shift.updateOne({ isShiftActive: false });
    await post(admin, { employeeId: employee._id, date: '2026-09-24', shiftId: shift._id, attendanceCategory: 'absent' }).expect(400);
  });

  test('derives category and ignores create category override', async () => {
    const response = await post(admin, { employeeId: employee._id, shiftId: shift._id, date: '2026-09-24', ...times('2026-09-24', '09:00', '13:00'), attendanceCategory: 'fullDay' }).expect(201);
    expect(response.body.attendanceCategory).toBe('halfDay');
    expect(response.body.totalWorkedHours).toBe(4);
  });

  test('supports overnight timestamps while keeping the business date', async () => {
    const response = await post(admin, { employeeId: employee._id, shiftId: shift._id, date: '2026-09-24', loginTime: '2026-09-24T22:00:00Z', logoutTime: '2026-09-25T06:00:00Z' }).expect(201);
    expect(new Date(response.body.date).toISOString()).toBe('2026-09-24T00:00:00.000Z');
    expect(response.body.totalWorkedHours).toBe(8);
    await post(admin, { employeeId: employee._id, date: '2026-09-25', shiftId: shift._id, loginTime: '2026-09-25T10:00:00Z', logoutTime: '2026-09-25T09:00:00Z' }).expect(400);
  });

  test('protects duplicate employee/date and present-today excludes absent', async () => {
    await post(admin, { employeeId: employee._id, shiftId: shift._id, date: '2026-09-24', ...times('2026-09-24', '09:00', '17:00') }).expect(201);
    await post(admin, { employeeId: employee._id, date: '2026-09-24', attendanceCategory: 'absent' }).expect(409);
    const present = await request(app).get('/v1/attendance/present-today').query({ date: '2026-09-24' }).set(auth(admin));
    expect(present.status).toBe(200);
    expect(present.body.results.some((item) => String(item.employee?._id) === String(employee._id))).toBe(true);
  });
});
