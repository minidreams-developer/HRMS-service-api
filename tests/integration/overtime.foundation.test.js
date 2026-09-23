const mongoose = require('mongoose');
const request = require('supertest');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');
const { User, Overtime } = require('../../src/models');
setupTestDB();
const id = () => new mongoose.Types.ObjectId();
const token = (u) => tokenService.generateToken(u._id, moment().add(1, 'day'), tokenTypes.ACCESS);
const auth = (u) => ({ Authorization: `Bearer ${token(u)}` });
const body = (employeeId, from = '18:00', to = '20:00', date = '2026-09-22') => ({ employeeId, OvertimeDate: `${date}T00:00:00.000Z`, startTime: `${date}T${from}:00.000Z`, endTime: `${date}T${to}:00.000Z`, reason: 'Release support' });

describe('OVERTIME-01 foundation', () => {
  let employee; let other; let admin;
  beforeEach(async () => {
    employee = await User.create({ _id: id(), name: 'OT Employee', email: `ot-${Date.now()}@example.com`, role: 'employee' });
    other = await User.create({ _id: id(), name: 'OT Other', email: `oto-${Date.now()}@example.com`, role: 'employee' });
    admin = await User.create({ _id: id(), name: 'OT Admin', email: `ota-${Date.now()}@example.com`, role: 'admin' });
  });
  const post = (u, b) => request(app).post('/v1/overtime').set(auth(u)).send(b);
  const create = async (u, b) => (await post(u, b).expect(201)).body;
  test('requires auth and enforces ownership', async () => { await request(app).get('/v1/overtime').expect(401); await post(employee, body(other._id)).expect(403); });
  test('employee self and management on-behalf creation calculate duration', async () => { const own = await create(employee, body(employee._id)); expect(own.totalDuration).toBe(2); const managed = await create(admin, body(other._id)); expect(String(managed.employeeId)).toBe(String(other._id)); });
  test('rejects invalid, zero, and inconsistent times', async () => { await post(employee, body(employee._id, '20:00', '18:00')).expect(400); await post(employee, body(employee._id, '18:00', '18:00')).expect(400); const b = body(employee._id); b.OvertimeDate = '2026-09-23T00:00:00.000Z'; await post(employee, b).expect(400); });
  test('supports overnight OT and ignores client duration', async () => { const b = body(employee._id, '22:00', '23:59'); b.endTime = '2026-09-23T01:00:00.000Z'; b.totalDuration = 99; const r = await create(employee, b); expect(r.totalDuration).toBe(3); });
  test('blocks active overlap but allows rejected/cancelled and adjacent ranges', async () => { await create(employee, body(employee._id)); await post(employee, body(employee._id, '19:00', '21:00')).expect(409); const p = await create(employee, body(employee._id, '20:00', '21:00')); await Overtime.updateOne({ _id: p.id }, { status: 'rejected' }); await Overtime.updateOne({ employeeId: employee._id, startTime: new Date('2026-09-22T18:00:00Z') }, { status: 'rejected' }); await create(employee, body(employee._id, '19:00', '21:00')); await create(employee, body(employee._id, '21:00', '22:00')); });
  test('management approval/rejection/cancellation metadata and transitions', async () => { const p = await create(employee, body(employee._id)); const a = await request(app).patch(`/v1/overtime/${p.id}/status`).set(auth(admin)).send({ status: 'approved' }).expect(200); expect(a.body.approvedBy).toBe(String(admin._id)); await request(app).patch(`/v1/overtime/${p.id}/status`).set(auth(admin)).send({ status: 'pending' }).expect(400); const r = await create(employee, body(employee._id, '21:00', '22:00')); const rej = await request(app).patch(`/v1/overtime/${r.id}/status`).set(auth(admin)).send({ status: 'rejected', rejectionReason: 'Not needed' }).expect(200); expect(rej.body.rejectionReason).toBe('Not needed'); const c = await create(employee, body(employee._id, '22:00', '23:00')); const can = await request(app).patch(`/v1/overtime/${c.id}/status`).set(auth(admin)).send({ status: 'cancelled', cancellationReason: 'Withdrawn' }).expect(200); expect(can.body.cancellationReason).toBe('Withdrawn'); });
  test('employee cannot approve or edit approved OT; history is scoped', async () => { const p = await create(employee, body(employee._id)); await request(app).patch(`/v1/overtime/${p.id}/status`).set(auth(employee)).send({ status: 'approved' }).expect(403); await request(app).patch(`/v1/overtime/${p.id}/status`).set(auth(admin)).send({ status: 'approved' }).expect(200); await request(app).patch(`/v1/overtime/${p.id}`).set(auth(employee)).send({ reason: 'changed' }).expect(400); await request(app).get(`/v1/overtime/employee/${other._id}`).set(auth(employee)).expect(403); await request(app).get(`/v1/overtime/employee/${employee._id}`).set(auth(employee)).expect(200); await request(app).get(`/v1/overtime/employee/${other._id}`).set(auth(admin)).expect(200); });
  test('soft-deleted employee history remains available', async () => { const p = await create(employee, body(employee._id)); await User.updateOne({ _id: employee._id }, { isDeleted: true, deletedAt: new Date() }); await request(app).get(`/v1/overtime/${p.id}`).set(auth(admin)).expect(200); });
});
