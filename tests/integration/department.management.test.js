const mongoose = require('mongoose');
const request = require('supertest');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User, Branch, Department } = require('../../src/models');
const branchService = require('../../src/services/branch.service');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');

setupTestDB();
const id = () => new mongoose.Types.ObjectId();
const headers = (user) => ({ Authorization: `Bearer ${tokenService.generateToken(user._id, moment().add(1, 'day'), tokenTypes.ACCESS)}` });

describe('SETTINGS-DEPARTMENT-03 management flow', () => {
  let admin; let employee; let branch; let otherBranch; let department;

  beforeEach(async () => {
    admin = await User.create({ _id: id(), name: 'Department Admin', email: `dept-admin-${Date.now()}@test.com`, role: 'admin', isEmailVerified: true });
    employee = await User.create({ _id: id(), name: 'Manoj Department Head', email: `dept-head-${Date.now()}@test.com`, role: 'employee', isEmailVerified: true });
    branch = await branchService.createBranch({ branchName: `Department Branch ${Date.now()}`, branchNumber: `DB-${Date.now()}` });
    otherBranch = await branchService.createBranch({ branchName: `Other Branch ${Date.now()}`, branchNumber: `OB-${Date.now()}` });
    employee.workInformation = { ...(employee.workInformation || {}), branch: branch._id };
    await employee.save();
  });

  const createBody = (overrides = {}) => ({
    departmentName: 'Quality Assurance',
    departmentCode: `DEPT_TEST_${Date.now()}`,
    branchId: String(branch._id),
    departmentDescription: 'QA Department',
    departmentHead: String(employee._id),
    ...overrides,
  });

  test('generates code and completes create/list/search/detail/edit/deactivate/reactivate flow', async () => {
    const auth = headers(admin);
    const generated = await request(app).get('/v1/departments/generate-id').set(auth).expect(200);
    expect(generated.body.departmentCode).toBeTruthy();

    const created = await request(app).post('/v1/departments').set(auth).send(createBody()).expect(201);
    department = created.body;
    expect(department.departmentName).toBe('Quality Assurance');
    expect(department.isActive).toBe(true);

    const list = await request(app).get('/v1/departments?page=1&limit=10').set(auth).expect(200);
    expect(list.body.results.some((item) => item.id === department.id)).toBe(true);
    expect(list.body.results.find((item) => item.id === department.id).departmentHead.name).toBe('Manoj Department Head');
    await request(app).get(`/v1/departments/${department.id}`).set(auth).expect(200);
    await request(app).get('/v1/departments?search=Quality').set(auth).expect(200);
    await request(app).get(`/v1/departments?search=${encodeURIComponent(department.departmentCode)}`).set(auth).expect(200);
    await request(app).get('/v1/departments?search=Manoj').set(auth).expect(200);

    await request(app).patch(`/v1/departments/${department.id}`).set(auth).send({ departmentName: 'QA Engineering', departmentDescription: 'Updated QA' }).expect(200);
    await request(app).delete(`/v1/departments/${department.id}`).set(auth).expect(204);
    expect((await Department.findById(department.id)).isActive).toBe(false);
    expect((await Department.findById(department.id)).deactivatedAt).toBeTruthy();

    const reactivated = await request(app).patch(`/v1/departments/${department.id}`).set(auth).send({ isActive: true }).expect(200);
    expect(reactivated.body.isActive).toBe(true);
    expect(reactivated.body.deactivatedAt).toBeFalsy();
    expect(reactivated.body.departmentName).toBe('QA Engineering');

    await request(app).patch(`/v1/departments/${department.id}`).set(auth).send({ isActive: false }).expect(200);
    await request(app).patch(`/v1/departments/${department.id}`).set(auth).send({ departmentDescription: 'Updated while inactive' }).expect(200);
    await request(app).patch(`/v1/departments/${department.id}`).set(auth).send({ isActive: true }).expect(200);
    expect((await request(app).get('/v1/departments?isActive=true').set(auth)).body.results.some((item) => item.id === department.id)).toBe(true);
  });

  test('rejects duplicate names/codes and invalid department heads', async () => {
    const auth = headers(admin);
    await request(app).post('/v1/departments').set(auth).send(createBody({ departmentCode: 'DUP-1' })).expect(201);
    await request(app).post('/v1/departments').set(auth).send(createBody({ departmentCode: 'DUP-2' })).expect(409);
    await request(app).post('/v1/departments').set(auth).send(createBody({ departmentName: 'Different', departmentCode: 'DUP-1' })).expect(409);
    await request(app).post('/v1/departments').set(auth).send(createBody({ departmentCode: 'BAD-HEAD', departmentHead: String(id()) })).expect(400);
    employee.isActive = 'In-Active'; await employee.save();
    await request(app).post('/v1/departments').set(auth).send(createBody({ departmentCode: 'INACTIVE-HEAD' })).expect(400);
  });

  test('provides head dropdown and rejects unauthorized access', async () => {
    const auth = headers(admin);
    const employeeHeaders = headers(employee);
    const dropdown = await request(app).get('/v1/users/dropdown?role=employee,staff').set(auth).expect(200);
    expect(dropdown.body.results || dropdown.body).toBeTruthy();
    await request(app).get('/v1/departments').expect(401);
    await request(app).get('/v1/departments').set(employeeHeaders).expect(403);
  });
});
