const mongoose = require('mongoose');
const request = require('supertest');
const moment = require('moment');
const httpStatus = require('http-status');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');
const { User, Permission, LeaveRequests } = require('../../src/models');

setupTestDB();
const id = () => new mongoose.Types.ObjectId();
const token = (user) => tokenService.generateToken(user._id, moment().add(1, 'day'), tokenTypes.ACCESS);
const headers = (user) => ({ Authorization: `Bearer ${token(user)}` });
const times = (from = '10:00', to = '12:00', date = '2026-05-04') => ({
  date, from: `${date}T${from}:00.000Z`, to: `${date}T${to}:00.000Z`, reason: 'Personal appointment',
});

describe('LEAVE-06 permission requests', () => {
  let employee; let other; let admin;
  beforeEach(async () => {
    employee = await User.create({ _id: id(), name: 'Permission Employee', email: `p-${Date.now()}@example.com`, role: 'employee' });
    other = await User.create({ _id: id(), name: 'Other Employee', email: `o-${Date.now()}@example.com`, role: 'employee' });
    admin = await User.create({ _id: id(), name: 'Permission Admin', email: `a-${Date.now()}@example.com`, role: 'admin' });
  });
  const create = (user, body = times()) => request(app).post('/v1/permissions').set(headers(user)).send({ user: body.user || employee._id, ...body });
  const stored = async (user, body = times()) => (await create(user, body).expect(201)).body;

  test('requires authentication', async () => { await request(app).get('/v1/permissions').expect(401); });
  test('employee creates own request and totalHours is derived', async () => { const r = await stored(employee); expect(r.user).toBe(String(employee._id)); expect(r.totalHours).toBe(2); });
  test('employee cannot create for another employee', async () => { await create(employee, { ...times(), user: other._id }).expect(403); });
  test('management can create for another employee', async () => { await create(admin, { ...times(), user: other._id }).expect(201); });
  test('invalid time range is rejected', async () => { await create(employee, times('12:00', '10:00')).expect(400); });
  test('overlapping pending and approved requests are blocked', async () => {
    await stored(employee); await create(employee).expect(409);
    const approved = await stored(employee, times('13:00', '14:00'));
    await Permission.updateOne({ _id: approved.id }, { permissionStatus: 'approved' });
    await create(employee, times('13:30', '15:00')).expect(409);
  });
  test('rejected and cancelled requests do not block', async () => {
    const rejected = await stored(employee); await Permission.updateOne({ _id: rejected.id }, { permissionStatus: 'rejected' });
    await stored(employee);
    const cancelled = await stored(employee, times('13:00', '14:00')); await Permission.updateOne({ _id: cancelled.id }, { permissionStatus: 'cancelled' });
    await stored(employee, times('13:00', '14:00'));
  });
  test('management approves; employee cannot approve', async () => {
    const p = await stored(employee);
    await request(app).patch(`/v1/permissions/${p.id}`).set(headers(employee)).send({ permissionStatus: 'approved' }).expect(403);
    await request(app).patch(`/v1/permissions/${p.id}`).set(headers(admin)).send({ permissionStatus: 'approved' }).expect(200);
  });
  test('rejection and cancellation metadata are stored', async () => {
    const rejected = await stored(employee); const rr = await request(app).patch(`/v1/permissions/${rejected.id}`).set(headers(admin)).send({ permissionStatus: 'rejected', rejectionReason: 'Busy' }).expect(200);
    expect(rr.body).toMatchObject({ rejectedBy: String(admin._id), rejectionReason: 'Busy' });
    const cancelled = await stored(employee, times('13:00', '14:00')); const cr = await request(app).patch(`/v1/permissions/${cancelled.id}`).set(headers(admin)).send({ permissionStatus: 'cancelled', cancellationReason: 'Changed plans' }).expect(200);
    expect(cr.body).toMatchObject({ cancelledBy: String(admin._id), cancellationReason: 'Changed plans' });
  });
  test('employee history is scoped; management can view another history', async () => {
    await stored(admin, { ...times(), user: other._id }); await request(app).get('/v1/permissions').set(headers(employee)).expect(200).then((r) => expect(r.body.results.every((p) => String(p.user) === String(employee._id))).toBe(true));
    await request(app).get(`/v1/permissions?user=${other._id}`).set(headers(employee)).expect(200).then((r) => expect(r.body.results).toHaveLength(0));
    await request(app).get(`/v1/permissions?user=${other._id}`).set(headers(admin)).expect(200).then((r) => expect(r.body.totalResults).toBe(1));
  });
  test('soft-deleted employee history remains available to management', async () => { const p = await stored(employee); await User.updateOne({ _id: employee._id }, { isDeleted: true, deletedAt: new Date() }); const r = await request(app).get(`/v1/permissions/${p.id}`).set(headers(admin)).expect(200); expect(String(r.body.user)).toBe(String(employee._id)); });
  test('approved full-day leave blocks permission', async () => {
    await LeaveRequests.create({ employeeId: employee._id, leaveType: 'Unpaid Leave', singleDate: '2026-05-04', leaveDuration: 'fullDay', status: 'approved' });
    await create(employee).expect(409);
  });
  test('filters and pagination work', async () => { const p = await stored(employee); await request(app).get('/v1/permissions').query({ permissionStatus: 'pending', page: 1, limit: 1 }).set(headers(admin)).expect(200).then((r) => { expect(r.body.page).toBe(1); expect(r.body.limit).toBe(1); expect(r.body.totalResults).toBe(1); }); expect(p.totalHours).toBe(2); });
  test('legacy permission without date remains readable', async () => { const p = await Permission.create({ user: employee._id, from: new Date('2026-05-04T10:00:00Z'), to: new Date('2026-05-04T11:00:00Z'), totalHours: 1, permissionStatus: 'pending' }); await request(app).get(`/v1/permissions/${p.id}`).set(headers(admin)).expect(200); });
});
