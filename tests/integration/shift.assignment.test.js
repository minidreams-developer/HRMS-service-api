const mongoose = require('mongoose');
const request = require('supertest');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');
const { User, Shift, ShiftAssignment, Attendance } = require('../../src/models');
const assignment = require('../../src/services/shiftAssignment.service');
const attendance = require('../../src/services/attendance.service');
setupTestDB();
const id = () => new mongoose.Types.ObjectId();
const token = (u) => tokenService.generateToken(u._id, moment().add(1, 'day'), tokenTypes.ACCESS);
const auth = (u) => ({ Authorization: `Bearer ${token(u)}` });
const shiftData = (name, extra = {}) => ({ shiftName: name, minWorkingHours: '8h', halfDayWorkingHours: '4h', ...extra });

describe('SHIFT-02 assignment history', () => {
  let employee; let other; let admin; let shiftA; let shiftB;
  beforeEach(async () => {
    [shiftA, shiftB] = await Shift.create([shiftData('Shift A'), shiftData('Shift B')]);
    [employee, other, admin] = await User.create([
      { _id: id(), name: 'Assignment Employee', email: `assign-${Date.now()}@example.com`, role: 'employee' },
      { _id: id(), name: 'Other Employee', email: `assign-other-${Date.now()}@example.com`, role: 'employee' },
      { _id: id(), name: 'Assignment Admin', email: `assign-admin-${Date.now()}@example.com`, role: 'admin' },
    ]);
  });
  const post = (u, body) => request(app).post('/v1/shift-assignments').set(auth(u)).send(body);
  const body = (employeeId = employee._id, shiftId = shiftA._id, from = '2026-09-01', extra = {}) => ({ employeeId, shiftId, effectiveFrom: from, ...extra });

  test('protects routes and enforces ownership/RBAC', async () => { await request(app).post('/v1/shift-assignments').send(body()).expect(401); await post(employee, body()).expect(403); const created = await post(admin, body()).expect(201); await request(app).get(`/v1/shift-assignments/employee/${employee._id}`).set(auth(employee)).expect(200); await request(app).get(`/v1/shift-assignments/employee/${other._id}`).set(auth(employee)).expect(403); await request(app).get(`/v1/shift-assignments/${created.body.id}`).set(auth(admin)).expect(200); });
  test('assigns active Shift, synchronizes current field, and audits actor', async () => { const result = await post(admin, body(employee._id, shiftA._id, '2026-09-01', { reason: 'Initial assignment', assignedBy: other._id })).expect(201); expect(String(result.body.assignedBy._id || result.body.assignedBy)).toBe(String(admin._id)); expect(result.body.reason).toBe('Initial assignment'); const saved = await User.findById(employee._id); expect(String(saved.workInformation.shiftId)).toBe(String(shiftA._id)); expect(result.body.isCurrent).toBe(true); });
  test('reassignment closes old assignment and keeps one current', async () => { await post(admin, body(employee._id, shiftA._id, '2026-09-01')).expect(201); const result = await post(admin, body(employee._id, shiftB._id, '2026-09-10')).expect(201); const all = await ShiftAssignment.find({ employeeId: employee._id }).sort({ effectiveFrom: 1 }); expect(all).toHaveLength(2); expect(all[0].isCurrent).toBe(false); expect(all[0].effectiveTo.toISOString().slice(0, 10)).toBe('2026-09-09'); expect(all[1].isCurrent).toBe(true); expect(String(result.body.shiftId._id || result.body.shiftId)).toBe(String(shiftB._id)); expect(String((await User.findById(employee._id)).workInformation.shiftId)).toBe(String(shiftB._id)); });
  test('resolves inclusive historical dates and legacy fallback', async () => { await ShiftAssignment.create({ employeeId: employee._id, shiftId: shiftA._id, effectiveFrom: '2026-09-01', effectiveTo: '2026-09-19', isCurrent: false }); await ShiftAssignment.create({ employeeId: employee._id, shiftId: shiftB._id, effectiveFrom: '2026-09-20', isCurrent: true }); const sep = await assignment.getEmployeeShiftForDate(employee._id, '2026-09-19'); expect(sep).not.toBeNull(); expect(String(sep._id)).toBe(String(shiftA._id)); const reassigned = await assignment.getEmployeeShiftForDate(employee._id, '2026-09-20'); expect(reassigned).not.toBeNull(); expect(String(reassigned._id)).toBe(String(shiftB._id)); const legacy = await User.create({ name: 'Legacy', email: `legacy-${Date.now()}@example.com`, role: 'employee', workInformation: { shiftId: shiftA._id } }); const legacyShift = await assignment.getEmployeeShiftForDate(legacy._id, '2026-01-01'); expect(legacyShift).not.toBeNull(); expect(String(legacyShift._id)).toBe(String(shiftA._id)); expect(await ShiftAssignment.countDocuments({ employeeId: legacy._id })).toBe(0); });
  test('rejects overlap, inactive/nonexistent, and future assignments', async () => { await post(admin, body(employee._id, shiftA._id, '2026-09-01', { effectiveTo: '2026-09-30' })).expect(201); await post(admin, body(employee._id, shiftB._id, '2026-09-20', { effectiveTo: '2026-10-15' })).expect(409); await shiftB.updateOne({ isShiftActive: false }); await post(admin, body(other._id, shiftB._id, '2026-09-01')).expect(400); await post(admin, body(other._id, id(), '2026-09-01')).expect(404); const future = new Date(); future.setUTCDate(future.getUTCDate() + 10); await post(admin, body(other._id, shiftA._id, future.toISOString())).expect(400); });
  test('deactivated historical Shift remains resolvable', async () => { await ShiftAssignment.create({ employeeId: employee._id, shiftId: shiftA._id, effectiveFrom: '2026-09-01', effectiveTo: '2026-09-30', isCurrent: false }); await shiftA.updateOne({ isShiftActive: false }); const resolved = await assignment.getEmployeeShiftForDate(employee._id, '2026-09-15'); expect(String(resolved._id)).toBe(String(shiftA._id)); });
  test('new Attendance resolves assignment Shift and stores snapshot', async () => { await ShiftAssignment.create({ employeeId: employee._id, shiftId: shiftA._id, effectiveFrom: '2026-09-01', effectiveTo: '2026-09-30', isCurrent: false }); await ShiftAssignment.create({ employeeId: employee._id, shiftId: shiftB._id, effectiveFrom: '2026-10-01', isCurrent: true }); const record = await attendance.createAttendance({ employeeId: employee._id, date: '2026-09-15', loginTime: '2026-09-15T09:00:00Z', logoutTime: '2026-09-15T17:00:00Z' }); expect(String(record.shiftId)).toBe(String(shiftA._id)); expect(record.shiftSnapshot.shiftName).toBe('Shift A'); });
  test('management can access soft-deleted employee history', async () => { await post(admin, body()).expect(201); await User.updateOne({ _id: employee._id }, { isDeleted: true, deletedAt: new Date() }); const result = await request(app).get(`/v1/shift-assignments/employee/${employee._id}`).set(auth(admin)).expect(200); expect(result.body.totalResults).toBe(1); });
});
