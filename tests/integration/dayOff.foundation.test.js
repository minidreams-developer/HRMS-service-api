const mongoose = require('mongoose');
const request = require('supertest');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');
const { User, DayOff } = require('../../src/models');
setupTestDB();
const id = () => new mongoose.Types.ObjectId();
const auth = (user) => ({ Authorization: `Bearer ${tokenService.generateToken(user._id, moment().add(1, 'day'), tokenTypes.ACCESS)}` });

describe('DAYOFF-HOLIDAY-01 Day Off foundation', () => {
  let employeeA; let employeeB; let admin;
  beforeEach(async () => {
    [employeeA, employeeB, admin] = await User.create([
      { _id: id(), name: 'Day Off A', email: `dayoff-a-${Date.now()}@example.com`, role: 'employee' },
      { _id: id(), name: 'Day Off B', email: `dayoff-b-${Date.now()}@example.com`, role: 'employee' },
      { _id: id(), name: 'Day Off Admin', email: `dayoff-admin-${Date.now()}@example.com`, role: 'admin' },
    ]);
  });
  const create = (user, body) => request(app).post('/v1/day-offs').set(auth(user)).send(body);

  test('protects create and normalizes date with audit actor', async () => {
    await request(app).post('/v1/day-offs').send({ employeeId: employeeA._id, date: '2026-10-05' }).expect(401);
    await create(employeeA, { employeeId: employeeA._id, date: '2026-10-05' }).expect(403);
    const response = await create(admin, { employeeId: employeeA._id, date: '2026-10-05T18:30:00+05:30', reason: 'Roster adjustment' }).expect(201);
    const saved = await DayOff.findById(response.body.id);
    expect(saved.date.toISOString()).toBe('2026-10-05T00:00:00.000Z');
    expect(saved.status).toBe(true);
    expect(String(saved.createdBy)).toBe(String(admin._id));
  });

  test('rejects duplicate active date and allows another employee', async () => {
    await create(admin, { employeeId: employeeA._id, date: '2026-10-06' }).expect(201);
    await create(admin, { employeeId: employeeA._id, date: '2026-10-06' }).expect(409);
    await create(admin, { employeeId: employeeB._id, date: '2026-10-06' }).expect(201);
  });

  test('supports self access, management history, and safe deactivation', async () => {
    const created = await create(admin, { employeeId: employeeA._id, date: '2026-10-07' }).expect(201);
    await request(app).get(`/v1/day-offs/employee/${employeeA._id}`).set(auth(employeeA)).expect(200);
    await request(app).get(`/v1/day-offs/employee/${employeeB._id}`).set(auth(employeeA)).expect(403);
    await request(app).get(`/v1/day-offs/employee/${employeeA._id}`).set(auth(admin)).expect(200);
    await request(app).delete(`/v1/day-offs/${created.body.id}`).set(auth(admin)).expect(204);
    const saved = await DayOff.findById(created.body.id);
    expect(saved.status).toBe(false);
    expect(saved.deactivatedAt).toBeTruthy();
  });
});
