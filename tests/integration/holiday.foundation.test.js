const mongoose = require('mongoose');
const request = require('supertest');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');
const { User, Holiday } = require('../../src/models');
setupTestDB();
const id = () => new mongoose.Types.ObjectId();
const auth = (user) => ({ Authorization: `Bearer ${tokenService.generateToken(user._id, moment().add(1, 'day'), tokenTypes.ACCESS)}` });

describe('DAYOFF-HOLIDAY-01 Holiday foundation', () => {
  let employeeA; let employeeB; let admin;
  beforeEach(async () => {
    [employeeA, employeeB, admin] = await User.create([
      { _id: id(), name: 'Holiday A', email: `holiday-a-${Date.now()}@example.com`, role: 'employee' },
      { _id: id(), name: 'Holiday B', email: `holiday-b-${Date.now()}@example.com`, role: 'employee' },
      { _id: id(), name: 'Holiday Admin', email: `holiday-admin-${Date.now()}@example.com`, role: 'admin' },
    ]);
  });
  const create = (user, body) => request(app).post('/v1/holidays').set(auth(user)).send(body);

  test('protects management routes and records audit actor/date', async () => {
    await request(app).post('/v1/holidays').send({ holidayTitle: 'No Auth' }).expect(401);
    await create(employeeA, { holidayTitle: 'Forbidden' }).expect(403);
    const response = await create(admin, { holidayTitle: 'National', date: '2026-10-02T18:30:00+05:30', people: [], createdBy: employeeA._id }).expect(201);
    const saved = await Holiday.findById(response.body.id);
    expect(saved.date.toISOString()).toBe('2026-10-02T00:00:00.000Z');
    expect(String(saved.createdBy)).toBe(String(admin._id));
  });

  test('global and employee-specific holidays are applicable through self endpoint', async () => {
    await create(admin, { holidayTitle: 'Global', date: '2026-10-02', people: [] }).expect(201);
    await create(admin, { holidayTitle: 'A only', date: '2026-10-03', people: [employeeA._id] }).expect(201);
    const a = await request(app).get('/v1/holidays/me').set(auth(employeeA)).expect(200);
    const b = await request(app).get('/v1/holidays/me').set(auth(employeeB)).expect(200);
    expect(a.body.map((item) => item.holidayTitle).sort()).toEqual(['A only', 'Global'].sort());
    expect(b.body.map((item) => item.holidayTitle)).toEqual(['Global']);
  });

  test('rejects overlapping active applicability and allows disjoint groups', async () => {
    await create(admin, { holidayTitle: 'A', date: '2026-10-02', people: [employeeA._id] }).expect(201);
    await create(admin, { holidayTitle: 'B', date: '2026-10-02', people: [employeeB._id] }).expect(201);
    await create(admin, { holidayTitle: 'Conflict', date: '2026-10-02', people: [employeeA._id, employeeB._id] }).expect(409);
    await create(admin, { holidayTitle: 'Global conflict', date: '2026-10-02', people: [] }).expect(409);
  });

  test('delete deactivates and preserves the Holiday', async () => {
    const created = await create(admin, { holidayTitle: 'Retained', date: '2026-10-04', people: [] }).expect(201);
    await request(app).delete(`/v1/holidays/${created.body.id}`).set(auth(admin)).expect(204);
    const saved = await Holiday.findById(created.body.id);
    expect(saved).not.toBeNull();
    expect(saved.status).toBe(false);
    expect(String(saved.deactivatedBy)).toBe(String(admin._id));
    expect(saved.deactivatedAt).toBeTruthy();
    expect((await request(app).get('/v1/holidays/me').set(auth(employeeA))).body).toEqual([]);
  });
});
