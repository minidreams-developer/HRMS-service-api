const mongoose = require('mongoose');
const request = require('supertest');
const moment = require('moment');
const httpStatus = require('http-status');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User, Shift, Roster, ShiftAssignment } = require('../../src/models');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');
const { getEffectiveShiftForDate } = require('../../src/services/roster.service');

setupTestDB();
const id = () => new mongoose.Types.ObjectId();
const token = (user) => tokenService.generateToken(user._id, moment().add(30, 'minutes'), tokenTypes.ACCESS);
const future = (days = 1) => new Date(Date.now() + days * 86400000).toISOString();
const userData = (role, suffix) => ({ _id: id(), name: `${role}-${suffix}`, employeeId: `${role.toUpperCase()}-${suffix}`, email: `${role}-${suffix}-${Date.now()}@example.com`, role });
const shiftData = (name, active = true) => ({ _id: id(), shiftName: name, shiftCode: name.toUpperCase(), isShiftActive: active, weekOff: [], minWorkingHours: '8h', halfDayWorkingHours: '4h' });

describe('ROSTER-01 foundation', () => {
  let admin; let employee; let staff; let shift; let otherShift;
  beforeEach(async () => {
    [admin, employee, staff] = await User.create([userData('admin', '1'), userData('employee', '1'), userData('staff', '1')]);
    [shift, otherShift] = await Shift.create([shiftData('Morning'), shiftData('Night')]);
  });

  test('requires management and creates a normalized roster for employee/staff', async () => {
    await request(app).post('/v1/roster').send({ employeeId: employee._id, date: future(), shiftId: shift._id }).expect(httpStatus.UNAUTHORIZED);
    await request(app).post('/v1/roster').set('Authorization', `Bearer ${token(employee)}`).send({ employeeId: employee._id, date: future(), shiftId: shift._id }).expect(httpStatus.FORBIDDEN);
    const response = await request(app).post('/v1/roster').set('Authorization', `Bearer ${token(admin)}`).send({ employeeId: employee._id, date: future(), shiftId: shift._id });
    expect(response.status).toBe(httpStatus.CREATED);
    expect(response.body.status).toBe('scheduled');
    expect(String(response.body.createdBy.id || response.body.createdBy._id || response.body.createdBy)).toBe(String(admin._id));
    expect(new Date(response.body.date).toISOString().endsWith('T00:00:00.000Z')).toBe(true);
    await request(app).post('/v1/roster').set('Authorization', `Bearer ${token(admin)}`).send({ employeeId: staff._id, date: future(2), shiftId: shift._id }).expect(httpStatus.CREATED);
  });

  test('rejects invalid targets/shifts and duplicate active dates', async () => {
    const headers = { Authorization: `Bearer ${token(admin)}` };
    await request(app).post('/v1/roster').set(headers).send({ employeeId: id(), date: future(), shiftId: shift._id }).expect(httpStatus.NOT_FOUND);
    const deleted = await User.create(userData('employee', 'deleted')); await User.updateOne({ _id: deleted._id }, { isDeleted: true });
    await request(app).post('/v1/roster').set(headers).send({ employeeId: deleted._id, date: future(), shiftId: shift._id }).expect(httpStatus.NOT_FOUND);
    const inactive = await Shift.create(shiftData('Inactive', false));
    await request(app).post('/v1/roster').set(headers).send({ employeeId: employee._id, date: future(), shiftId: inactive._id }).expect(httpStatus.BAD_REQUEST);
    const body = { employeeId: employee._id, date: future(), shiftId: shift._id };
    await request(app).post('/v1/roster').set(headers).send(body).expect(httpStatus.CREATED);
    await request(app).post('/v1/roster').set(headers).send(body).expect(httpStatus.CONFLICT);
  });

  test('rejects relieved and inactive users for new roster assignments', async () => {
    const headers = { Authorization: `Bearer ${token(admin)}` };
    await User.updateOne({ _id: employee._id }, { isActive: 'Relieved' });
    await request(app).post('/v1/roster').set(headers).send({ employeeId: employee._id, date: future(), shiftId: shift._id }).expect(httpStatus.BAD_REQUEST);
    await User.updateOne({ _id: staff._id }, { isActive: 'Inactive' });
    await request(app).post('/v1/roster').set(headers).send({ employeeId: staff._id, date: future(), shiftId: shift._id }).expect(httpStatus.BAD_REQUEST);
  });

  test('supports update, cancellation, bulk assignment, and views', async () => {
    const headers = { Authorization: `Bearer ${token(admin)}` };
    const created = await request(app).post('/v1/roster').set(headers).send({ employeeId: employee._id, date: future(), shiftId: shift._id }).expect(httpStatus.CREATED);
    const updated = await request(app).patch(`/v1/roster/${created.body.id || created.body._id}`).set(headers).send({ shiftId: otherShift._id, notes: 'Updated' }).expect(httpStatus.OK);
    expect(String(updated.body.updatedBy.id || updated.body.updatedBy._id || updated.body.updatedBy)).toBe(String(admin._id));
    const bulk = await request(app).post('/v1/roster/bulk').set(headers).send({ employeeIds: [staff._id], fromDate: future(3), toDate: future(5), shiftId: shift._id }).expect(httpStatus.CREATED);
    expect(bulk.body.createdCount).toBe(3);
    const dayView = await request(app).get(`/v1/roster/day/${future().slice(0, 10)}`).set(headers).expect(httpStatus.OK);
    expect(dayView.body).toHaveProperty('shifts');
    expect(dayView.body).toHaveProperty('unassigned');
    await request(app).delete(`/v1/roster/${created.body.id || created.body._id}`).set(headers).expect(httpStatus.OK);
    expect(await Roster.countDocuments({ status: 'cancelled' })).toBe(1);
  });

  test('resolves Roster before ShiftAssignment and legacy shift', async () => {
    const legacy = await Shift.create(shiftData('Legacy'));
    const assigned = await Shift.create(shiftData('Assigned'));
    const rosterShift = await Shift.create(shiftData('Roster'));
    await User.updateOne({ _id: employee._id }, { 'workInformation.shiftId': legacy._id });
    await ShiftAssignment.create({ employeeId: employee._id, shiftId: assigned._id, effectiveFrom: new Date('2026-01-01') });
    await Roster.create({ employeeId: employee._id, date: new Date('2026-09-28'), shiftId: rosterShift._id, createdBy: admin._id });
    expect(String((await getEffectiveShiftForDate(employee._id, '2026-09-28'))._id)).toBe(String(rosterShift._id));
    expect(String((await getEffectiveShiftForDate(employee._id, '2026-09-29'))._id)).toBe(String(assigned._id));
  });
});
