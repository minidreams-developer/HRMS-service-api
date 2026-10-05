const mongoose = require('mongoose');
const request = require('supertest');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');
const { User, Shift, Attendance, LeaveRequests } = require('../../src/models');
const attendance = require('../../src/services/attendance.service');
const leave = require('../../src/services/leaveRequests.service');
setupTestDB();
const id = () => new mongoose.Types.ObjectId();
const token = (u) => tokenService.generateToken(u._id, moment().add(1, 'day'), tokenTypes.ACCESS);
const auth = (u) => ({ Authorization: `Bearer ${token(u)}` });
const valid = (overrides = {}) => ({ shiftName: 'Test Shift', shiftType: 'Fixed', totalShiftDuration: '9h', minWorkingHours: '8h', halfDayWorkingHours: '4h', timings: [{ day: 'Monday', startTime: '09:00', endTime: '18:00', off: false }], ...overrides });

describe('SHIFT-01 foundation', () => {
  let employee; let admin;
  beforeEach(async () => {
    employee = await User.create({ _id: id(), name: 'Shift Employee', email: `shift-${Date.now()}@example.com`, role: 'employee' });
    admin = await User.create({ _id: id(), name: 'Shift Admin', email: `shifta-${Date.now()}@example.com`, role: 'admin' });
  });
  const create = (u, data) => request(app).post('/v1/shifts').set(auth(u)).send(data);
  test('auth and management RBAC', async () => { await request(app).get('/v1/shifts').expect(401); await create(employee, valid()).expect(403); const r = await create(admin, valid()).expect(201); await request(app).patch(`/v1/shifts/${r.body.id}`).set(auth(employee)).send({ shiftName: 'x' }).expect(403); await request(app).patch(`/v1/shifts/${r.body.id}`).set(auth(admin)).send({ shiftName: 'Updated' }).expect(200); });
  test('supports Fixed/Flexible and rejects unsupported types', async () => { await create(admin, valid({ shiftType: 'Fixed' })).expect(201); await create(admin, valid({ shiftType: 'Flexible' })).expect(201); for (const shiftType of ['Night', 'Custom']) await create(admin, valid({ shiftType })).expect(400); const legacy = await Shift.create({ shiftName: 'Legacy', shiftType: 'Rotational' }); await request(app).get(`/v1/shifts/${legacy.id}`).set(auth(employee)).expect(200); });
  test('validates timings, duplicate weekdays, off days, and overnight timing', async () => { await create(admin, valid({ timings: [{ day: 'Monday', startTime: '9:00', endTime: '18:00' }] })).expect(400); await create(admin, valid({ timings: [{ day: 'Funday', startTime: '09:00', endTime: '18:00' }] })).expect(400); await create(admin, valid({ timings: [{ day: 'Monday', startTime: '09:00', endTime: '18:00' }, { day: 'Monday', startTime: '10:00', endTime: '19:00' }] })).expect(400); await create(admin, valid({ timings: [{ day: 'Saturday', off: true }] })).expect(201); await create(admin, valid({ timings: [{ day: 'Monday', startTime: '22:00', endTime: '06:00' }] })).expect(201); await create(admin, valid({ timings: [{ day: 'Monday', startTime: '09:00', endTime: '09:00' }] })).expect(400); });
  test('validates thresholds and week-offs', async () => { await create(admin, valid()).expect(201); await create(admin, valid({ halfDayWorkingHours: '9h' })).expect(400); await create(admin, valid({ minWorkingHours: '10h' })).expect(400); await create(admin, valid({ minWorkingHours: '8' })).expect(400); await create(admin, valid({ weekOff: ['Saturday', 'Sunday'] })).expect(201); await create(admin, valid({ weekOff: ['Funday'] })).expect(400); });
  test('break enabled and disabled behavior plus attendance snapshot', async () => {
    const shift = await Shift.create({ ...valid(), breakManagement: { enabled: true, duration: 60 } });
    const date = new Date('2026-08-03T00:00:00Z'); const a = await attendance.createAttendance({ employeeId: employee._id, shiftId: shift._id, date, loginTime: new Date('2026-08-03T09:00:00Z'), logoutTime: new Date('2026-08-03T17:00:00Z') });
    expect(a.totalWorkedHours).toBe(7); expect(a.shiftSnapshot).toMatchObject({ minWorkingHours: '8h', breakEnabled: true, breakDuration: 60 });
    const disabled = await Shift.create({ ...valid({ shiftName: 'No Break' }), breakManagement: { enabled: false, duration: 60 } });
    const b = await attendance.createAttendance({ employeeId: employee._id, shiftId: disabled._id, date: new Date('2026-08-04T00:00:00Z'), loginTime: new Date('2026-08-04T09:00:00Z'), logoutTime: new Date('2026-08-04T17:00:00Z') }); expect(b.totalWorkedHours).toBe(8);
  });
  test('deactivation preserves references and audit metadata', async () => { const shift = await Shift.create({ ...valid(), createdBy: admin._id }); employee.workInformation.shiftId = shift._id; await employee.save(); const a = await Attendance.create({ employeeId: employee._id, shiftId: shift._id, date: new Date('2026-08-05') }); const r = await request(app).delete(`/v1/shifts/${shift.id}`).set(auth(admin)).expect(204); expect(r.status).toBe(204); const saved = await Shift.findById(shift.id); expect(saved).toMatchObject({ isShiftActive: false, deactivatedBy: admin._id }); expect(saved.deactivatedAt).toBeTruthy(); expect(String((await User.findById(employee.id)).workInformation.shiftId)).toBe(String(shift.id)); expect(String((await Attendance.findById(a.id)).shiftId)).toBe(String(shift.id)); });
  test('inactive/nonexistent assignments are rejected while active assignment works', async () => { const active = await Shift.create(valid()); await request(app).patch(`/v1/users/${employee.id}`).set(auth(admin)).send({ workInformation: { shiftId: active.id } }).expect(200); await active.updateOne({ isShiftActive: false }); await request(app).patch(`/v1/users/${employee.id}`).set(auth(admin)).send({ workInformation: { shiftId: active.id } }).expect(400); await request(app).patch(`/v1/users/${employee.id}`).set(auth(admin)).send({ workInformation: { shiftId: id() } }).expect(400); });
  test('leave stores week-off snapshot', async () => { const shift = await Shift.create({ ...valid(), weekOff: ['Sunday'] }); employee.workInformation.shiftId = shift._id; await employee.save(); const r = await leave.createLeaveRequests({ employeeId: employee._id, leaveType: 'Unpaid Leave', singleDate: '2026-08-06' }); expect([...r.shiftWeekOffSnapshot]).toEqual(['Sunday']); expect([...((await LeaveRequests.findById(r.id)).shiftWeekOffSnapshot)]).toEqual(['Sunday']); });
});
