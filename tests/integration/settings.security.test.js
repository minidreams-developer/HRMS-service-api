const request = require('supertest');
const httpStatus = require('http-status');
const bcrypt = require('bcryptjs');
const moment = require('moment');
const mongoose = require('mongoose');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User, Role, Organization, DaySetting } = require('../../src/models');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');

setupTestDB();

const token = (user) => tokenService.generateToken(user._id, moment().add(1, 'day'), tokenTypes.ACCESS);
const headers = (user) => ({ Authorization: `Bearer ${token(user)}` });
const id = () => new mongoose.Types.ObjectId();

async function makeUser(role, extra = {}) {
  return User.create({
    _id: id(),
    name: `${role} user`,
    email: `${role}-${Date.now()}-${Math.random()}@example.com`,
    password: await bcrypt.hash('password1', 8),
    role,
    isEmailVerified: true,
    ...extra,
  });
}

function permissions(group, module, actions = {}) {
  return [{ group, modules: [{ module, enabled: true, permissions: { view: false, add: false, edit: false, delete: false, ...actions } }] }];
}

describe('SETTINGS-01 security', () => {
  test('role routes require admin or subAdmin', async () => {
    const employee = await makeUser('employee');
    const admin = await makeUser('admin');
    const subAdmin = await makeUser('subAdmin');
    await request(app).get('/v1/roles').expect(httpStatus.UNAUTHORIZED);
    await request(app).get('/v1/roles').set(headers(employee)).expect(httpStatus.FORBIDDEN);
    await request(app).get('/v1/roles').set(headers(admin)).expect(httpStatus.OK);
    await request(app).get('/v1/roles').set(headers(subAdmin)).expect(httpStatus.OK);
  });

  test('organization, day settings, and series configuration are protected', async () => {
    const employee = await makeUser('employee');
    const admin = await makeUser('admin');
    await request(app).get('/v1/organizations').expect(httpStatus.UNAUTHORIZED);
    await request(app).get('/v1/organizations').set(headers(employee)).expect(httpStatus.FORBIDDEN);
    await request(app).get('/v1/organizations').set(headers(admin)).expect(httpStatus.OK);
    await request(app).get('/v1/day-settings').set(headers(employee)).expect(httpStatus.FORBIDDEN);
    await request(app).post('/v1/day-settings').set(headers(admin)).send({ startTime: '09:00', endTime: '18:00' }).expect(httpStatus.CREATED);
    await request(app).get('/v1/seriesConfiguration').set(headers(employee)).expect(httpStatus.FORBIDDEN);
    await request(app).post('/v1/seriesConfiguration').set(headers(admin)).send({
      seriesName: 'Test', voucherType: 'employee', prefix: 'T-', suffix: 'X', startingNo: 1, lengthOfZero: 4,
    }).expect(httpStatus.CREATED);
  });

  test('roleId accepts active roles and rejects inactive or unknown roles', async () => {
    const admin = await makeUser('admin');
    const role = await Role.create({ name: 'Scoped Staff', permissions: permissions('peopleHub', 'employees', { view: true }) });
    const body = { name: 'Role linked', email: `linked-${Date.now()}@example.com`, password: 'password1', role: 'staff', roleId: role._id.toString() };
    const created = await request(app).post('/v1/users').set(headers(admin)).send(body).expect(httpStatus.CREATED);
    expect(created.body.roleId).toBeTruthy();
    const inactive = await Role.create({ name: 'Inactive Role', isActive: false });
    await request(app).patch(`/v1/users/${created.body.id}`).set(headers(admin)).send({ roleId: inactive._id.toString() }).expect(httpStatus.BAD_REQUEST);
    await request(app).patch(`/v1/users/${created.body.id}`).set(headers(admin)).send({ roleId: id().toString() }).expect(httpStatus.BAD_REQUEST);
  });

  test('dynamic permission allows mapped reads and denies unmapped mutations', async () => {
    const role = await Role.create({ name: 'Read Employees', permissions: permissions('peopleHub', 'employees', { view: true }) });
    const staff = await makeUser('staff', { roleId: role._id });
    await request(app).get('/v1/users').set(headers(staff)).expect(httpStatus.OK);
    await request(app).post('/v1/users').set(headers(staff)).send({ name: 'x', email: 'x@example.com', password: 'password1', role: 'employee' }).expect(httpStatus.FORBIDDEN);
  });

  test('inactive dynamic role is denied and role deletion is soft', async () => {
    const role = await Role.create({ name: 'Temporary', permissions: permissions('peopleHub', 'employees', { view: true }) });
    const staff = await makeUser('staff', { roleId: role._id });
    role.isActive = false;
    await role.save();
    await request(app).get('/v1/users').set(headers(staff)).expect(httpStatus.FORBIDDEN);

    const admin = await makeUser('admin');
    const removable = await Role.create({ name: 'Removable' });
    await request(app).delete(`/v1/roles/${removable._id}`).set(headers(admin)).expect(httpStatus.NO_CONTENT);
    expect((await Role.findById(removable._id)).isActive).toBe(false);
    const system = await Role.create({ name: 'System', isSystemRole: true });
    await request(app).delete(`/v1/roles/${system._id}`).set(headers(admin)).expect(httpStatus.BAD_REQUEST);
  });

  test('settings master dynamic permission is enforced', async () => {
    const role = await Role.create({ name: 'Department Reader', permissions: permissions('settings', 'departments', { view: true }) });
    const staff = await makeUser('staff', { roleId: role._id });
    await request(app).get('/v1/departments').set(headers(staff)).expect(httpStatus.OK);
    await request(app).post('/v1/departments').set(headers(staff)).send({ departmentName: 'Denied' }).expect(httpStatus.FORBIDDEN);
  });

  test('active custom settings role can view roles but cannot mutate them', async () => {
    const role = await Role.create({
      name: 'Roles Viewer',
      permissions: permissions('settings', 'roles', { view: true }),
    });
    const employee = await makeUser('employee', { roleId: role._id });
    const auth = headers(employee);

    await request(app).get('/v1/roles').set(auth).expect(httpStatus.OK);
    await request(app).post('/v1/roles').set(auth).send({ name: 'Denied' }).expect(httpStatus.FORBIDDEN);
    await request(app).patch(`/v1/roles/${role._id}`).set(auth).send({ description: 'Denied' }).expect(httpStatus.FORBIDDEN);
    await request(app).delete(`/v1/roles/${role._id}`).set(auth).expect(httpStatus.FORBIDDEN);
  });

  test('inactive custom settings role is denied and privilege escalation is blocked', async () => {
    const inactiveRole = await Role.create({
      name: 'Inactive Settings Viewer',
      permissions: permissions('settings', 'roles', { view: true }),
      isActive: false,
    });
    const inactiveEmployee = await makeUser('employee', { roleId: inactiveRole._id });
    await request(app).get('/v1/roles').set(headers(inactiveEmployee)).expect(httpStatus.FORBIDDEN);

    const limitedRole = await Role.create({
      name: 'Limited Role Editor',
      permissions: permissions('settings', 'roles', { view: true, edit: true }),
    });
    const editor = await makeUser('employee', { roleId: limitedRole._id });
    const target = await Role.create({ name: 'Target Role' });
    await request(app).patch(`/v1/roles/${target._id}/permissions`)
      .set(headers(editor))
      .send({ permissions: permissions('settings', 'roles', { view: true, add: true, edit: true, delete: true }) })
      .expect(httpStatus.FORBIDDEN);
  });

  test('custom settings permissions apply to other settings routes', async () => {
    const role = await Role.create({
      name: 'Day Settings Viewer',
      permissions: permissions('settings', 'daySettings', { view: true }),
    });
    const employee = await makeUser('employee', { roleId: role._id });
    await request(app).get('/v1/day-settings').set(headers(employee)).expect(httpStatus.OK);
    await request(app).post('/v1/day-settings').set(headers(employee)).send({ startTime: '09:00', endTime: '18:00' }).expect(httpStatus.FORBIDDEN);
  });

  test('custom view role can access the remaining management read APIs', async () => {
    const role = await Role.create({
      name: 'Global Read Role',
      permissions: [
        permissions('standalone', 'dashboard', { view: true })[0],
        permissions('peopleHub', 'branch', { view: true })[0],
        permissions('peopleHub', 'teams', { view: true })[0],
        permissions('settings', 'departments', { view: true })[0],
        permissions('timeHub', 'shiftManagement', { view: true })[0],
        permissions('timeHub', 'attendance', { view: true })[0],
      ],
    });
    const employee = await makeUser('employee', { roleId: role._id });
    const auth = headers(employee);

    await request(app).get('/v1/dashboard').set(auth).expect(httpStatus.OK);
    await request(app).get('/v1/dashboard/attendance-overview?period=week').set(auth).expect(httpStatus.OK);
    await request(app).get('/v1/dashboard/payroll-breakdown?period=month').set(auth).expect(httpStatus.OK);
    await request(app).get('/v1/departments').set(auth).expect(httpStatus.OK);
    await request(app).get('/v1/branches').set(auth).expect(httpStatus.OK);
    await request(app).get('/v1/teams').set(auth).expect(httpStatus.OK);
    await request(app).get('/v1/shifts').set(auth).expect(httpStatus.OK);
    await request(app).get('/v1/designations/dropdown').set(auth).expect(httpStatus.OK);
    await request(app).get('/v1/attendance/present-today?role=employee').set(auth).expect(httpStatus.OK);

    const admin = await makeUser('admin');
    await request(app).get('/v1/dashboard').set(headers(admin)).expect(httpStatus.OK);
    await request(app).get('/v1/shifts').set(headers(admin)).expect(httpStatus.OK);
    await request(app).get('/v1/attendance/present-today?role=employee').set(headers(admin)).expect(httpStatus.OK);
  });

  test('missing or inactive permissions remain forbidden for global read APIs', async () => {
    const role = await Role.create({
      name: 'No Dashboard Read',
      permissions: permissions('standalone', 'dashboard'),
    });
    const employee = await makeUser('employee', { roleId: role._id });
    await request(app).get('/v1/dashboard').set(headers(employee)).expect(httpStatus.FORBIDDEN);
    role.isActive = false;
    await role.save();
    await request(app).get('/v1/dashboard').set(headers(employee)).expect(httpStatus.FORBIDDEN);
  });

  test('legacy dashboard group maps only to dashboard and does not grant unrelated access', async () => {
    const role = await Role.create({
      name: 'Legacy Dashboard Reader',
      permissions: [{
        group: 'dashboard',
        modules: [{ module: 'dashboard', enabled: true, permissions: { view: true, add: false, edit: false, delete: false } }],
      }],
    });
    const employee = await makeUser('employee', { roleId: role._id });
    const auth = headers(employee);

    await request(app).get('/v1/dashboard').set(auth).expect(httpStatus.OK);
    await request(app).get('/v1/dashboard/attendance-overview?period=week').set(auth).expect(httpStatus.OK);
    await request(app).get('/v1/dashboard/payroll-breakdown?period=month').set(auth).expect(httpStatus.OK);
    await request(app).get('/v1/departments').set(auth).expect(httpStatus.FORBIDDEN);
    await request(app).get('/v1/attendance/present-today?role=employee').set(auth).expect(httpStatus.FORBIDDEN);
    await request(app).get('/v1/shifts').set(auth).expect(httpStatus.FORBIDDEN);
    await request(app).get('/v1/payroll?page=1&limit=1').set(auth).expect(httpStatus.FORBIDDEN);
  });
});
