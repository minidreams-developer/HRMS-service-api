const mongoose = require('mongoose');
const request = require('supertest');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');
const { User, Announcement } = require('../../src/models');

setupTestDB();
const id = () => new mongoose.Types.ObjectId();
const auth = (user) => ({ Authorization: `Bearer ${tokenService.generateToken(user._id, moment().add(1, 'day'), tokenTypes.ACCESS)}` });

describe('ANNOUNCEMENT-01 security and audience', () => {
  let admin;
  let employee;

  beforeEach(async () => {
    admin = await User.create({ _id: id(), name: 'Announcement Admin', email: `ann-admin-${Date.now()}@example.com`, role: 'admin' });
    employee = await User.create({ _id: id(), name: 'Announcement Employee', email: `ann-employee-${Date.now()}@example.com`, role: 'employee' });
  });

  test('protects management endpoints and stores createdBy', async () => {
    await request(app).post('/v1/announcements').send({ title: 'No auth' }).expect(401);
    await request(app).post('/v1/announcements').set(auth(employee)).send({ title: 'Employee' }).expect(403);
    const response = await request(app).post('/v1/announcements').set(auth(admin)).send({ title: 'Global' }).expect(201);
    expect(response.body.createdBy).toBe(String(admin._id));
  });

  test('matches audience with OR semantics and hides non-matches', async () => {
    await Announcement.create({ title: 'Staff only', status: 'published', audience: { roles: ['staff'] } });
    await Announcement.create({ title: 'Employee only', status: 'published', audience: { roles: ['employee'] } });
    const response = await request(app).get('/v1/announcements/me').set(auth(employee)).expect(200);
    expect(response.body.results.map((item) => item.title)).toContain('Employee only');
    expect(response.body.results.map((item) => item.title)).not.toContain('Staff only');
  });

  test('does not expose drafts, scheduled, or inactive announcements', async () => {
    await Announcement.create({ title: 'Published', status: 'published' });
    await Announcement.create({ title: 'Draft', status: 'draft' });
    await Announcement.create({ title: 'Scheduled', status: 'scheduled' });
    await Announcement.create({ title: 'Inactive', status: 'published', isActive: false });
    const response = await request(app).get('/v1/announcements/me').set(auth(employee)).expect(200);
    expect(response.body.results.map((item) => item.title)).toEqual(expect.arrayContaining(['Published']));
    expect(response.body.results.map((item) => item.title)).not.toEqual(expect.arrayContaining(['Draft', 'Scheduled', 'Inactive']));
  });

  test('delete deactivates instead of removing the record', async () => {
    const announcement = await Announcement.create({ title: 'Deactivate me', status: 'published' });
    await request(app).delete(`/v1/announcements/${announcement._id}`).set(auth(admin)).expect(204);
    const stored = await Announcement.findById(announcement._id);
    expect(stored).not.toBeNull();
    expect(stored.isActive).toBe(false);
    expect(String(stored.deactivatedBy)).toBe(String(admin._id));
    expect(stored.deactivatedAt).toBeInstanceOf(Date);
  });
});
