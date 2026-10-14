const request = require('supertest');
const moment = require('moment');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User, Role } = require('../../src/models');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');

setupTestDB();
const id = () => new mongoose.Types.ObjectId();
const headers = (user) => ({ Authorization: `Bearer ${tokenService.generateToken(user._id, moment().add(1, 'day'), tokenTypes.ACCESS)}` });
const permissions = (view = false, add = false, edit = false, del = false) => ({ view, add, edit, delete: del });

describe('SETTINGS-ROLES-01 management', () => {
  let admin;
  beforeEach(async () => {
    admin = await User.create({ _id: id(), name: 'Role Admin', email: `role-admin-${Date.now()}@test.com`, password: await bcrypt.hash('password1', 8), role: 'admin', isEmailVerified: true });
  });

  test('creates, searches, edits, and reads a custom role permission matrix', async () => {
    const auth = headers(admin);
    const body = {
      name: 'Assistant Manager',
      description: 'People Hub access role',
      permissions: [{ group: 'peopleHub', modules: [{ module: 'employees', enabled: true, permissions: permissions(true, true, false, false) }] }],
    };
    const created = await request(app).post('/v1/roles').set(auth).send(body).expect(201);
    expect(created.body.name).toBe(body.name);
    expect(created.body._id || created.body.id).toBeTruthy();
    const roleId = created.body.id || created.body._id;

    expect((await request(app).get('/v1/roles?search=People%20Hub').set(auth)).body.results).toHaveLength(1);
    expect((await request(app).get('/v1/roles?name=Assistant%20Manager').set(auth)).body.results).toHaveLength(1);
    const detail = await request(app).get(`/v1/roles/${roleId}`).set(auth).expect(200);
    expect(detail.body.permissions[0].modules[0].permissions.add).toBe(true);
    await request(app).patch(`/v1/roles/${roleId}`).set(auth).send({ description: 'Updated role' }).expect(200);
    await request(app).patch(`/v1/roles/${roleId}/permissions/peopleHub/employees`).set(auth).send({ permissions: permissions(true, true, true, true) }).expect(200);
    expect((await request(app).get(`/v1/roles/${roleId}/permissions`).set(auth)).body.permissions[0].modules[0].permissions.delete).toBe(true);
  });

  test('enforces dynamic permission on a protected API and handles role lifecycle safely', async () => {
    const auth = headers(admin);
    const role = await Role.create({ name: `Employee Reader ${Date.now()}`, description: 'Searchable description', permissions: [{ group: 'peopleHub', modules: [{ module: 'employees', enabled: true, permissions: permissions(true) }] }] });
    const staff = await User.create({ _id: id(), name: 'Scoped Staff', email: `scoped-${Date.now()}@test.com`, password: await bcrypt.hash('password1', 8), role: 'staff', roleId: role._id, isEmailVerified: true });
    await request(app).get('/v1/users').set(headers(staff)).expect(200);
    await request(app).post('/v1/users').set(headers(staff)).send({ name: 'Denied', email: `denied-${Date.now()}@test.com`, password: 'password1', role: 'employee' }).expect(403);
    await request(app).post('/v1/roles').set(auth).send({ name: 'Duplicate Role', description: 'x' }).expect(201);
    await request(app).post('/v1/roles').set(auth).send({ name: 'Duplicate Role', description: 'x' }).expect(400);
    await request(app).delete(`/v1/roles/${role._id}`).set(auth).expect(204);
    expect((await Role.findById(role._id)).isActive).toBe(false);
    await request(app).get('/v1/users').set(headers(staff)).expect(403);
    const system = await Role.create({ name: `System Role ${Date.now()}`, isSystemRole: true });
    await request(app).delete(`/v1/roles/${system._id}`).set(auth).expect(400);
    await request(app).patch(`/v1/roles/${system._id}`).set(auth).send({ isSystemRole: false }).expect(400);
  });

  test('rejects unauthorized role management', async () => {
    const employee = await User.create({ _id: id(), name: 'Employee', email: `role-employee-${Date.now()}@test.com`, password: await bcrypt.hash('password1', 8), role: 'employee', isEmailVerified: true });
    await request(app).get('/v1/roles').expect(401);
    await request(app).get('/v1/roles').set(headers(employee)).expect(403);
    await request(app).post('/v1/roles').set(headers(employee)).send({ name: 'Denied Role' }).expect(403);
  });

  test('isolates dashboard, attendance, payroll, and paysheet permissions on real routes', async () => {
    const adminAuth = headers(admin);
    const role = await Role.create({
      name: `Route Isolation ${Date.now()}`,
      permissions: [
        { group: 'standalone', modules: [{ module: 'dashboard', enabled: true, permissions: permissions(true) }] },
        { group: 'payHub', modules: [{ module: 'payroll', enabled: true, permissions: permissions(true) }, { module: 'paysheet', enabled: false, permissions: permissions(true) }] },
        { group: 'timeHub', modules: [{ module: 'attendance', enabled: false, permissions: permissions(true) }] },
      ],
    });
    const scoped = await User.create({
      _id: id(), name: 'Route Scoped User', email: `route-scoped-${Date.now()}@test.com`,
      password: await bcrypt.hash('password1', 8), role: 'hr_manager', roleId: role._id, isEmailVerified: true,
    });
    const scopedAuth = headers(scoped);

    await request(app).get('/v1/dashboard').set(scopedAuth).expect(200);
    await request(app).get('/v1/payroll?page=1&limit=1').set(scopedAuth).expect(200);
    await request(app).get('/v1/attendance?page=1&limit=1').set(scopedAuth).expect(403);
    await request(app).get('/v1/paysheets/dashboard').set(scopedAuth).expect(403);

    await request(app).patch(`/v1/roles/${role._id}/permissions/standalone/dashboard`).set(adminAuth)
      .send({ permissions: permissions(false) }).expect(200);
    await request(app).patch(`/v1/roles/${role._id}/permissions/payHub/payroll`).set(adminAuth)
      .send({ permissions: permissions(false) }).expect(200);
    await request(app).patch(`/v1/roles/${role._id}/permissions/timeHub/attendance`).set(adminAuth)
      .send({ enabled: true, permissions: permissions(true) }).expect(200);

    await request(app).get('/v1/dashboard').set(scopedAuth).expect(403);
    await request(app).get('/v1/payroll?page=1&limit=1').set(scopedAuth).expect(403);
    await request(app).get('/v1/attendance?page=1&limit=1').set(scopedAuth).expect(200);
  });

  test('isolates agents, leave, overtime, shift, and hierarchy permissions', async () => {
    const role = await Role.create({
      name: `Module Isolation ${Date.now()}`,
      permissions: [
        { group: 'peopleHub', modules: [{ module: 'agents', enabled: true, permissions: permissions(true) }, { module: 'hierarchy', enabled: true, permissions: permissions(true) }] },
        { group: 'timeHub', modules: [{ module: 'leaveAttendance', enabled: true, permissions: permissions(true) }, { module: 'overtimeManagement', enabled: true, permissions: permissions(true) }, { module: 'shiftManagement', enabled: true, permissions: permissions(true) }] },
      ],
    });
    const scoped = await User.create({ _id: id(), name: 'Module Scoped User', email: `module-scoped-${Date.now()}@test.com`, password: await bcrypt.hash('password1', 8), role: 'hr_manager', roleId: role._id, isEmailVerified: true });
    const scopedAuth = headers(scoped);

    await request(app).get('/v1/users/agent/invalid/members').set(scopedAuth).expect(200);
    await request(app).get('/v1/hierarchy/tree').set(scopedAuth).expect(200);
    await request(app).get('/v1/leave-requests?page=1&limit=1').set(scopedAuth).expect(200);
    await request(app).get('/v1/overtime?limit=1').set(scopedAuth).expect(200);
    await request(app).get('/v1/shifts?page=1&limit=1').set(scopedAuth).expect(200);
  });

  test('reactivating a role restores dynamic access without updating the user', async () => {
    const auth = headers(admin);
    const role = await Role.create({
      name: `Reactivation Role ${Date.now()}`,
      permissions: [{ group: 'timeHub', modules: [{ module: 'attendance', enabled: true, permissions: permissions(true) }] }],
    });
    const scoped = await User.create({ _id: id(), name: 'Reactivation User', email: `reactivation-${Date.now()}@test.com`, password: await bcrypt.hash('password1', 8), role: 'hr_manager', roleId: role._id, isEmailVerified: true });
    const scopedAuth = headers(scoped);

    await request(app).get('/v1/attendance?page=1&limit=1').set(scopedAuth).expect(200);
    await request(app).patch(`/v1/roles/${role._id}`).set(auth).send({ isActive: false }).expect(200);
    await request(app).get('/v1/attendance?page=1&limit=1').set(scopedAuth).expect(403);
    await request(app).patch(`/v1/roles/${role._id}`).set(auth).send({ isActive: true }).expect(200);
    await request(app).get('/v1/attendance?page=1&limit=1').set(scopedAuth).expect(200);
  });

  test('verifies remaining module-specific real route authorization', async () => {
    const auth = headers(admin);
    const role = await Role.create({
      name: `Remaining Modules ${Date.now()}`,
      permissions: [
        { group: 'timeHub', modules: [{ module: 'leaderboard', enabled: true, permissions: permissions(true) }, { module: 'attendance', enabled: false, permissions: permissions(true) }] },
        { group: 'peopleHub', modules: [{ module: 'offBoarding', enabled: true, permissions: permissions(true) }] },
        { group: 'standalone', modules: [{ module: 'announcement', enabled: true, permissions: permissions(true, true, true, true) }] },
        { group: 'payHub', modules: [{ module: 'stopPayroll', enabled: true, permissions: permissions(true, false, true) }, { module: 'additionDeductions', enabled: true, permissions: permissions(true, true, true, true) }, { module: 'payroll', enabled: false, permissions: permissions(true) }] },
      ],
    });
    const scoped = await User.create({ _id: id(), name: 'Remaining Modules User', email: `remaining-${Date.now()}@test.com`, password: await bcrypt.hash('password1', 8), role: 'hr_manager', roleId: role._id, isEmailVerified: true });
    const scopedAuth = headers(scoped);
    const expectAllowedOrValidation = async (promise) => {
      const response = await promise;
      expect(response.status).not.toBe(403);
    };

    await expectAllowedOrValidation(request(app).get('/v1/leaderboard').set(scopedAuth));
    await request(app).get('/v1/attendance?page=1&limit=1').set(scopedAuth).expect(403);
    await expectAllowedOrValidation(request(app).get('/v1/off-board?page=1&limit=1').set(scopedAuth));
    await expectAllowedOrValidation(request(app).get('/v1/announcements?page=1&limit=1').set(scopedAuth));
    await expectAllowedOrValidation(request(app).get('/v1/payroll/stop/dashboard').set(scopedAuth));
    await expectAllowedOrValidation(request(app).get('/v1/payroll/adjustments?page=1&limit=1').set(scopedAuth));
    await request(app).get('/v1/payroll?page=1&limit=1').set(scopedAuth).expect(403);

    await request(app).patch(`/v1/roles/${role._id}/permissions/timeHub/leaderboard`).set(auth).send({ permissions: permissions(false) }).expect(200);
    await request(app).get('/v1/leaderboard').set(scopedAuth).expect(403);
    await request(app).patch(`/v1/roles/${role._id}/permissions/payHub/stopPayroll`).set(auth).send({ permissions: permissions(false, false, false) }).expect(200);
    await request(app).get('/v1/payroll/stop/dashboard').set(scopedAuth).expect(403);
    await request(app).patch(`/v1/roles/${role._id}/permissions/payHub/additionDeductions`).set(auth).send({ permissions: permissions(false) }).expect(200);
    await request(app).get('/v1/payroll/adjustments?page=1&limit=1').set(scopedAuth).expect(403);
  });

  test('verifies mutation action permissions on real routes', async () => {
    const auth = headers(admin);
    const role = await Role.create({
      name: `Mutation Modules ${Date.now()}`,
      permissions: [
        { group: 'standalone', modules: [{ module: 'announcement', enabled: true, permissions: permissions(false, true, true, true) }] },
        { group: 'payHub', modules: [{ module: 'stopPayroll', enabled: true, permissions: permissions(false, false, true) }, { module: 'additionDeductions', enabled: true, permissions: permissions(false, true, true, true) }] },
      ],
    });
    const scoped = await User.create({ _id: id(), name: 'Mutation Scoped User', email: `mutation-${Date.now()}@test.com`, password: await bcrypt.hash('password1', 8), role: 'hr_manager', roleId: role._id, isEmailVerified: true });
    const scopedAuth = headers(scoped);
    const objectId = id().toString();
    const expectAuthorizedOrBusinessError = async (promise) => {
      const response = await promise;
      expect(response.status).not.toBe(403);
    };

    await expectAuthorizedOrBusinessError(request(app).post('/v1/announcements').set(scopedAuth).send({}));
    await expectAuthorizedOrBusinessError(request(app).patch(`/v1/announcements/${objectId}`).set(scopedAuth).send({}));
    await expectAuthorizedOrBusinessError(request(app).delete(`/v1/announcements/${objectId}`).set(scopedAuth));
    await expectAuthorizedOrBusinessError(request(app).post(`/v1/payroll/${objectId}/stop`).set(scopedAuth).send({}));
    await expectAuthorizedOrBusinessError(request(app).post(`/v1/payroll/${objectId}/resume`).set(scopedAuth).send({}));
    await expectAuthorizedOrBusinessError(request(app).post('/v1/payroll/adjustments').set(scopedAuth).send({}));
    await expectAuthorizedOrBusinessError(request(app).patch(`/v1/payroll/adjustments/${objectId}`).set(scopedAuth).send({}));
    await expectAuthorizedOrBusinessError(request(app).patch(`/v1/payroll/adjustments/${objectId}/status`).set(scopedAuth).send({}));
    await expectAuthorizedOrBusinessError(request(app).delete(`/v1/payroll/adjustments/${objectId}`).set(scopedAuth));

    await request(app).patch(`/v1/roles/${role._id}/permissions/standalone/announcement`).set(auth).send({ permissions: permissions(false) }).expect(200);
    await request(app).post('/v1/announcements').set(scopedAuth).send({}).expect(403);
    await request(app).patch(`/v1/roles/${role._id}/permissions/payHub/stopPayroll`).set(auth).send({ permissions: permissions(false) }).expect(200);
    await request(app).post(`/v1/payroll/${objectId}/stop`).set(scopedAuth).send({}).expect(403);
    await request(app).patch(`/v1/roles/${role._id}/permissions/payHub/additionDeductions`).set(auth).send({ permissions: permissions(false) }).expect(200);
    await request(app).post('/v1/payroll/adjustments').set(scopedAuth).send({}).expect(403);
  });
});
