const mongoose = require('mongoose');
const request = require('supertest');
const httpStatus = require('http-status');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User, LeaveRequests } = require('../../src/models');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');

setupTestDB();
const id = () => new mongoose.Types.ObjectId();
const token = (user) => tokenService.generateToken(user._id, moment().add(30, 'minutes'), tokenTypes.ACCESS);

describe('LEAVE-03 listing and history', () => {
  let employee;
  let other;
  let admin;

  beforeEach(async () => {
    employee = await User.create({ _id: id(), name: 'List Employee', employeeId: 'EMP-LIST-1', email: `list-${Date.now()}-${Math.random()}@example.com`, role: 'employee' });
    other = await User.create({ _id: id(), name: 'Other List Employee', employeeId: 'EMP-LIST-2', email: `other-list-${Date.now()}-${Math.random()}@example.com`, role: 'employee' });
    admin = await User.create({ _id: id(), name: 'List Admin', email: `list-admin-${Date.now()}-${Math.random()}@example.com`, role: 'admin' });
  });

  const leave = (overrides = {}) => ({ employeeId: employee._id, leaveType: 'Casual Leave', singleDate: '2026-05-15', leaveDuration: 'fullDay', status: 'pending', ...overrides });

  test('protects management list and allows management access', async () => {
    await LeaveRequests.create(leave());
    await request(app).get('/v1/leave-requests').set('Authorization', `Bearer ${token(employee)}`).expect(httpStatus.FORBIDDEN);
    const response = await request(app).get('/v1/leave-requests').set('Authorization', `Bearer ${token(admin)}`).expect(httpStatus.OK);
    expect(response.body).toMatchObject({ page: 1, limit: 10, totalResults: 1 });
  });

  test('supports status, employee, leave type, search, pagination, and sorting', async () => {
    await LeaveRequests.create(leave({ status: 'pending', singleDate: '2026-05-15' }));
    await LeaveRequests.create(leave({ status: 'approved', singleDate: '2026-05-16', leaveType: 'Sick Leave' }));
    await LeaveRequests.create(leave({ employeeId: other._id, status: 'rejected', singleDate: '2026-05-17' }));
    const headers = { Authorization: `Bearer ${token(admin)}` };
    expect((await request(app).get('/v1/leave-requests?status=approved').set(headers)).body.totalResults).toBe(1);
    expect((await request(app).get(`/v1/leave-requests?employeeId=${employee._id}`).set(headers)).body.totalResults).toBe(2);
    expect((await request(app).get('/v1/leave-requests?leaveType=Sick').set(headers)).body.totalResults).toBe(1);
    expect((await request(app).get('/v1/leave-requests?search=EMP-LIST-1').set(headers)).body.totalResults).toBe(2);
    expect((await request(app).get('/v1/leave-requests?limit=1&page=2&sortBy=singleDate:desc').set(headers)).body).toMatchObject({ page: 2, limit: 1, totalResults: 3 });
  });

  test('uses overlap-aware date and year filters', async () => {
    await LeaveRequests.create(leave({ startDate: '2025-12-30', endDate: '2026-01-03', singleDate: null, status: 'approved' }));
    await LeaveRequests.create(leave({ singleDate: '2026-06-01', status: 'ended' }));
    const headers = { Authorization: `Bearer ${token(admin)}` };
    expect((await request(app).get('/v1/leave-requests?fromDate=2026-01-01&toDate=2026-01-01').set(headers)).body.totalResults).toBe(1);
    expect((await request(app).get('/v1/leave-requests/employee/' + employee._id + '?year=2026').set(headers)).body.totalResults).toBe(2);
  });

  test('employee self-history works, cross-user access is blocked, and response preserves half-day/legacy metadata', async () => {
    await LeaveRequests.create(leave({ leaveDuration: 'halfDay', halfDaySession: 'firstHalf', status: 'rejected', rejectedBy: admin._id, rejectedAt: new Date(), rejectionReason: 'Reason' }));
    await LeaveRequests.create(leave({ employeeId: other._id, status: 'ended' }));
    const own = await request(app).get(`/v1/leave-requests/employee/${employee._id}?status=rejected`).set('Authorization', `Bearer ${token(employee)}`).expect(httpStatus.OK);
    expect(own.body.results[0]).toMatchObject({ leaveDuration: 'halfDay', halfDaySession: 'firstHalf', status: 'rejected', rejectionReason: 'Reason' });
    await request(app).get(`/v1/leave-requests/employee/${other._id}`).set('Authorization', `Bearer ${token(employee)}`).expect(httpStatus.FORBIDDEN);
    const managed = await request(app).get(`/v1/leave-requests/employee/${other._id}`).set('Authorization', `Bearer ${token(admin)}`).expect(httpStatus.OK);
    expect(managed.body.results[0].status).toBe('ended');
  });
});
