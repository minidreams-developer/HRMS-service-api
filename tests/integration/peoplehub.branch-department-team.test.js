const mongoose = require('mongoose');
const request = require('supertest');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User, Branch, Department, Team } = require('../../src/models');
const branchService = require('../../src/services/branch.service');
const departmentService = require('../../src/services/department.service');
const teamService = require('../../src/services/team.service');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');

setupTestDB();
const id = () => new mongoose.Types.ObjectId();
const headers = (user) => ({ Authorization: `Bearer ${tokenService.generateToken(user._id, moment().add(30, 'minutes'), tokenTypes.ACCESS)}` });

describe('PEOPLEHUB-01 Branch/Department/Team foundation', () => {
  let admin; let employee; let branchA; let branchB;
  beforeEach(async () => {
    [admin, employee] = await User.create([
      { _id: id(), name: 'People Admin', email: `p-admin-${Date.now()}@x.test`, role: 'admin' },
      { _id: id(), name: 'People Employee', email: `p-employee-${Date.now()}@x.test`, role: 'employee' },
    ]);
    branchA = await branchService.createBranch({ branchName: 'Branch A', branchNumber: `BA-${Date.now()}` });
    branchB = await branchService.createBranch({ branchName: 'Branch B', branchNumber: `BB-${Date.now()}` });
  });

  test('secures routes and deactivates branch without deleting it', async () => {
    await request(app).get('/v1/branches').expect(401);
    await request(app).get('/v1/branches').set(headers(employee)).expect(403);
    await request(app).delete(`/v1/branches/${branchA._id}`).set(headers(admin)).expect(204);
    expect((await Branch.findById(branchA._id)).branchStatus).toBe('inactive');
  });

  test('enforces scoped department/team creation and duplicates', async () => {
    const department = await departmentService.createDepartment({ branchId: branchA._id, departmentName: 'Milling', departmentCode: 'MIL-A' });
    await expect(departmentService.createDepartment({ branchId: branchA._id, departmentName: 'milling', departmentCode: 'MIL-B' })).rejects.toThrow();
    await expect(departmentService.createDepartment({ branchId: branchB._id, departmentName: 'Milling', departmentCode: 'MIL-A' })).resolves.toBeDefined();
    const team = await teamService.createTeam({ department: department._id, teamName: 'Night', teamCode: 'NIGHT-A' });
    await expect(teamService.createTeam({ department: department._id, teamName: 'night', teamCode: 'NIGHT-B' })).rejects.toThrow();
    await teamService.deleteTeamById(team._id);
    expect((await Team.findById(team._id)).isActive).toBe(false);
  });
});
