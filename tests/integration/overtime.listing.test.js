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
const auth = (user) => ({ Authorization: `Bearer ${tokenService.generateToken(user._id, moment().add(1, 'day'), tokenTypes.ACCESS)}` });

describe('OVERTIME-BUG-01 listing aggregation', () => {
  let admin; let employee;
  beforeEach(async () => {
    admin = await User.create({ _id: id(), name: 'OT Admin', email: `ot-list-admin-${Date.now()}@example.com`, role: 'admin' });
    employee = await User.create({ _id: id(), name: 'OT Employee', email: `ot-list-employee-${Date.now()}@example.com`, role: 'employee', workInformation: { department: { legacy: true, label: 'Old Department Object' } } });
  });

  test('pending list tolerates legacy object department values and preserves pagination', async () => {
    await Overtime.create({ employeeId: employee._id, OvertimeDate: new Date('2026-09-24T00:00:00Z'), startTime: new Date('2026-09-24T18:00:00Z'), endTime: new Date('2026-09-24T20:00:00Z'), totalDuration: 2, status: 'pending' });
    const response = await request(app).get('/v1/overtime').query({ status: 'pending', limit: 100, page: 1 }).set(auth(admin)).expect(200);
    expect(response.body.totalResults).toBe(1);
    expect(response.body.results).toHaveLength(1);
    expect(response.body.limit).toBe(100);
    expect(response.body.results[0].employee.name).toBe('OT Employee');
  });
});
