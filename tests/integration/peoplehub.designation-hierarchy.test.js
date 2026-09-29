const mongoose = require('mongoose');
const request = require('supertest');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User, Branch, Designation } = require('../../src/models');
const userService = require('../../src/services/user.service');
const hierarchyService = require('../../src/services/hierarchy.service');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');
setupTestDB();
const id = () => new mongoose.Types.ObjectId();
const auth = (u) => ({ Authorization: `Bearer ${tokenService.generateToken(u._id, moment().add(30, 'minutes'), tokenTypes.ACCESS)}` });

describe('PEOPLEHUB-02 designation and hierarchy', () => {
  let admin; let employee; let branch;
  beforeEach(async () => {
    [admin, employee] = await User.create([
      { _id: id(), name: 'PH Admin', email: `ph-a-${Date.now()}@x.test`, role: 'admin' },
      { _id: id(), name: 'PH Employee', email: `ph-e-${Date.now()}@x.test`, role: 'employee' },
    ]);
    branch = await Branch.create({ branchName: 'PH Branch', branchNumber: `PH-${Date.now()}` });
  });
  test('designation CRUD is protected, unique, and deactivates', async () => {
    await request(app).post('/v1/designations').send({ designationName: 'Engineer', designationCode: 'ENG-1' }).expect(401);
    const created = await request(app).post('/v1/designations').set(auth(admin)).send({ designationName: 'Engineer', designationCode: 'ENG-1' }).expect(201);
    await request(app).post('/v1/designations').set(auth(admin)).send({ designationName: 'engineer', designationCode: 'ENG-2' }).expect(409);
    await request(app).delete(`/v1/designations/${created.body.id}`).set(auth(admin)).expect(204);
    expect((await Designation.findById(created.body.id)).isActive).toBe(false);
  });
  test('reporting assignment enforces same branch, self, and inactive manager rules', async () => {
    const manager = await User.create({ _id: id(), name: 'Manager', email: `ph-m-${Date.now()}@x.test`, role: 'manager', workInformation: { branch: branch._id } });
    await expect(userService.updateUserById(employee._id, { workInformation: { branch: branch._id, reportingPerson: manager._id } })).resolves.toBeDefined();
    await expect(userService.updateUserById(employee._id, { workInformation: { reportingPerson: employee._id } })).rejects.toThrow();
    await User.updateOne({ _id: manager._id }, { isActive: 'In-Active' });
    await expect(userService.updateUserById(employee._id, { workInformation: { reportingPerson: manager._id } })).rejects.toThrow();
  });
  test('hierarchy direct reports are management protected', async () => {
    await request(app).get(`/v1/hierarchy/reports/${employee._id}`).expect(401);
    await request(app).get(`/v1/hierarchy/reports/${employee._id}`).set(auth(employee)).expect(403);
    const result = await hierarchyService.getDirectReports(employee._id, {}, { page: 1, limit: 10 });
    expect(result.totalResults).toBe(0);
  });
});
