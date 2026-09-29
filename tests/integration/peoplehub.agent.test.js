const mongoose = require('mongoose');
const request = require('supertest');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User, Branch } = require('../../src/models');
const userService = require('../../src/services/user.service');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');
setupTestDB();
const id = () => new mongoose.Types.ObjectId();
const headers = (u) => ({ Authorization: `Bearer ${tokenService.generateToken(u._id, moment().add(30, 'minutes'), tokenTypes.ACCESS)}` });
describe('PEOPLEHUB-03 Agent management', () => {
  let admin; let employee; let staff; let branch;
  beforeEach(async () => {
    [admin, employee, staff] = await User.create([
      { _id: id(), name: 'Agent Admin', email: `ag-a-${Date.now()}@x.test`, role: 'admin' },
      { _id: id(), name: 'Agent Employee', email: `ag-e-${Date.now()}@x.test`, role: 'employee' },
      { _id: id(), name: 'Agent Staff', email: `ag-s-${Date.now()}@x.test`, role: 'staff' },
    ]);
    branch = await Branch.create({ branchName: 'Agent Branch', branchNumber: `AG-${Date.now()}` });
  });
  test('protects creation and forces agent role', async () => {
    const body = { name: 'Field Agent', email: `agent-${Date.now()}@x.test`, password: 'password1', agentId: `AGT-${Date.now()}`, branch: branch._id };
    await request(app).post('/v1/users/agent').send(body).expect(401);
    await request(app).post('/v1/users/agent').set(headers(employee)).send(body).expect(403);
    const result = await request(app).post('/v1/users/agent').set(headers(admin)).send({ ...body, email: `agent2-${Date.now()}@x.test` }).expect(201);
    expect(result.body.role).toBe('agent');
  });
  test('assigns employee and staff once, rejects cross-branch and supports removal', async () => {
    const agent = await User.create({ _id: id(), name: 'Agent', email: `agent-${Date.now()}@x.test`, role: 'agent', agentId: `AG-${Date.now()}`, isActive: 'Active', workInformation: { branch: branch._id } });
    await User.updateMany({ _id: { $in: [employee._id, staff._id] } }, { 'workInformation.branch': branch._id });
    await request(app).post(`/v1/users/agent/${agent._id}/members`).set(headers(admin)).send({ workerIds: [employee._id, staff._id] }).expect(200);
    await expect(userService.assignAgentWorkers(agent._id, [employee._id])).resolves.toBeDefined();
    await request(app).delete(`/v1/users/agent/${agent._id}/members/${employee._id}`).set(headers(admin)).expect(204);
    const otherBranch = await Branch.create({ branchName: 'Other', branchNumber: `OT-${Date.now()}` });
    await User.updateOne({ _id: employee._id }, { 'workInformation.branch': otherBranch._id });
    await expect(userService.assignAgentWorkers(agent._id, [employee._id])).rejects.toThrow();
  });
});
