const mongoose = require('mongoose');
const request = require('supertest');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');
const { User } = require('../../src/models');

setupTestDB();
const id = () => new mongoose.Types.ObjectId();
const headers = (user) => ({ Authorization: `Bearer ${tokenService.generateToken(user._id, moment().add(1, 'day'), tokenTypes.ACCESS)}` });

describe('DASHBOARD-01 security foundation', () => {
  test('requires authentication', async () => {
    await request(app).get('/v1/dashboard/quick-stats').expect(401);
  });

  test.each(['employee', 'staff', 'agent', 'contractor', 'team_lead'])('%s cannot access management dashboard', async (role) => {
    const user = await User.create({ _id: id(), name: role, email: `${role}-${Date.now()}@example.com`, role });
    await request(app).get('/v1/dashboard/quick-stats').set(headers(user)).expect(403);
  });

  test.each(['admin', 'subAdmin', 'hr_manager'])('%s can access dashboard', async (role) => {
    const user = await User.create({ _id: id(), name: role, email: `${role}-${Date.now()}@example.com`, role });
    await request(app).get('/v1/dashboard/quick-stats').set(headers(user)).expect(200);
  });

  test('returns explicit zero-safe workforce metrics', async () => {
    const admin = await User.create({ _id: id(), name: 'Dashboard Admin', email: `dashboard-${Date.now()}@example.com`, role: 'admin' });
    const response = await request(app).get('/v1/dashboard/quick-stats').set(headers(admin)).expect(200);
    expect(response.body).toEqual(expect.objectContaining({
      totalEmployees: expect.any(Object),
      totalStaff: expect.any(Object),
      totalActiveUsers: expect.any(Object),
      totalInactiveUsers: expect.any(Object),
      totalRelievedUsers: expect.any(Object),
      newEmployees: expect.any(Object),
    }));
  });
});
