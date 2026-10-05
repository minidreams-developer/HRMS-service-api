const mongoose = require('mongoose');
const request = require('supertest');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');
const { User, Shift, ShiftAssignment, Roster, Attendance } = require('../../src/models');
const shiftAssignment = require('../../src/services/shiftAssignment.service');
const roster = require('../../src/services/roster.service');
const attendance = require('../../src/services/attendance.service');

setupTestDB();
const id = () => new mongoose.Types.ObjectId();
const auth = (user) => ({ Authorization: `Bearer ${tokenService.generateToken(user._id, moment().add(1, 'day'), tokenTypes.ACCESS)}` });
const childData = (name, extra = {}) => ({ shiftName: name, shiftType: 'Fixed', minWorkingHours: '8h', halfDayWorkingHours: '4h', timings: [{ day: 'Monday', startTime: '09:00', endTime: '17:00', off: false }], ...extra });

describe('SHIFT-ROTATION-01', () => {
  let admin; let employee; let morning; let afternoon; let night;
  beforeEach(async () => {
    [admin, employee] = await User.create([
      { _id: id(), name: 'Rotation Admin', email: `rotation-admin-${Date.now()}@example.com`, role: 'admin' },
      { _id: id(), name: 'Rotation Employee', email: `rotation-employee-${Date.now()}@example.com`, role: 'employee' },
    ]);
    [morning, afternoon, night] = await Shift.create([childData('Morning'), childData('Afternoon'), childData('Night')]);
  });
  const create = (body) => request(app).post('/v1/shifts').set(auth(admin)).send(body);
  const rotation = (shiftIds = [morning._id, afternoon._id, night._id], extra = {}) => ({ shiftType: 'Rotational', shiftName: 'Weekly Rotation', shiftCode: `ROT${Date.now()}${Math.floor(Math.random() * 1000)}`, rotation: { shiftIds, rotationType: 'Weekly', rotationDuration: 7, effectiveStartDate: '2026-10-05', ...extra } });

  test('validates rotational configuration', async () => {
    await create(rotation()).expect(201);
    await create(rotation([morning._id])).expect(400);
    await create(rotation([morning._id, morning._id, night._id])).expect(400);
    await morning.updateOne({ isShiftActive: false });
    await create(rotation()).expect(400);
    await morning.updateOne({ isShiftActive: true });
    const nested = await Shift.create({ shiftName: 'Nested', shiftType: 'Rotational', rotation: { shiftIds: [afternoon._id, night._id], rotationType: 'Weekly', rotationDuration: 7, effectiveStartDate: '2026-10-05' } });
    await create(rotation([nested._id, afternoon._id])).expect(400);
    await create(rotation([morning._id, afternoon._id, night._id], { rotationType: 'Daily' })).expect(400);
    await create(rotation([morning._id, afternoon._id, night._id], { rotationDuration: 0 })).expect(400);
  });

  test('resolves the dated sequence and returns no shift before the anchor', async () => {
    const rotational = await Shift.create(rotation());
    await ShiftAssignment.create({ employeeId: employee._id, shiftId: rotational._id, effectiveFrom: '2026-01-01', isCurrent: true });
    for (const [date, expected] of [['2026-10-05', morning], ['2026-10-11', morning], ['2026-10-12', afternoon], ['2026-10-18', afternoon], ['2026-10-19', night], ['2026-10-25', night], ['2026-10-26', morning]]) {
      // eslint-disable-next-line no-await-in-loop
      expect(String((await shiftAssignment.getEmployeeShiftForDate(employee._id, date))._id)).toBe(String(expected._id));
    }
    expect(await shiftAssignment.getEmployeeShiftForDate(employee._id, '2026-10-04')).toBeNull();
  });

  test('protects child deactivation and allows historical rotational reads', async () => {
    const rotational = await Shift.create(rotation());
    await request(app).delete(`/v1/shifts/${morning._id}`).set(auth(admin)).expect(409);
    await request(app).delete(`/v1/shifts/${rotational._id}`).set(auth(admin)).expect(204);
    await ShiftAssignment.create({ employeeId: employee._id, shiftId: rotational._id, effectiveFrom: '2026-01-01', isCurrent: true });
    expect((await ShiftAssignment.findOne({ employeeId: employee._id })).shiftId.toString()).toBe(rotational._id.toString());
  });

  test('inactive rotational shifts cannot be assigned', async () => {
    const rotational = await Shift.create(rotation());
    await rotational.updateOne({ isShiftActive: false });
    await request(app).post('/v1/shift-assignments').set(auth(admin)).send({ employeeId: employee._id, shiftId: rotational._id, effectiveFrom: '2026-10-01' }).expect(400);
  });

  test('roster overrides rotation for one date and then rotation resumes', async () => {
    const rotational = await Shift.create(rotation());
    await ShiftAssignment.create({ employeeId: employee._id, shiftId: rotational._id, effectiveFrom: '2026-01-01', isCurrent: true });
    await Roster.create({ employeeId: employee._id, shiftId: night._id, date: new Date('2026-10-05'), createdBy: admin._id });
    expect(String((await roster.getEffectiveShiftForDate(employee._id, '2026-10-05'))._id)).toBe(String(night._id));
    expect(String((await roster.getEffectiveShiftForDate(employee._id, '2026-10-06'))._id)).toBe(String(morning._id));
  });

  test('attendance uses the resolved child shift and preserves its snapshot', async () => {
    const child = await Shift.findByIdAndUpdate(morning._id, { overtimeAfterHours: 6, breakManagement: { enabled: true, duration: 30 }, gracePeriod: { lateCheckIn: 5 }, attendanceRules: { lateMarkAfter: 10 } }, { new: true });
    const rotational = await Shift.create(rotation());
    await ShiftAssignment.create({ employeeId: employee._id, shiftId: rotational._id, effectiveFrom: '2026-01-01', isCurrent: true });
    const record = await attendance.createAttendance({ employeeId: employee._id, date: '2026-10-05', loginTime: '2026-10-05T09:00:00Z', logoutTime: '2026-10-05T18:00:00Z' });
    expect(String(record.shiftId)).toBe(String(child._id));
    expect(record.shiftSnapshot).toMatchObject({ shiftId: child._id, overtimeAfterHours: 6, breakEnabled: true, breakDuration: 30 });
  });
});
