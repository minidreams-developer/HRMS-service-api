const mongoose = require('mongoose');
const request = require('supertest');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User, Department, Branch, Shift, Payroll, ContractorSettlement } = require('../../src/models');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');

setupTestDB();
const id = () => new mongoose.Types.ObjectId();
const auth = (user) => ({ Authorization: `Bearer ${tokenService.generateToken(user._id, moment().add(1, 'day'), tokenTypes.ACCESS)}` });

describe('GLOBAL-FILTER-SYSTEM-06 dedicated endpoint verification', () => {
  let admin; let departmentA; let departmentB; let branchA; let branchB; let shiftA; let employeeA; let employeeB; let contractorA; let contractorB;

  beforeEach(async () => {
    admin = await User.create({ _id: id(), name: 'Filter Admin', email: `filter-admin-${Date.now()}@example.com`, role: 'admin' });
    [branchA, branchB] = await Branch.create([{ branchName: 'Branch A' }, { branchName: 'Branch B' }]);
    [departmentA, departmentB] = await Department.create([
      { departmentName: 'Milling', departmentCode: `M-${Date.now()}`, branchId: branchA._id },
      { departmentName: 'Packing', departmentCode: `P-${Date.now()}`, branchId: branchB._id },
    ]);
    shiftA = await Shift.create({ shiftName: 'Morning Filter', shiftType: 'Fixed', minWorkingHours: '8h', halfDayWorkingHours: '4h' });
    [employeeA, employeeB] = await User.create([
      { _id: id(), name: 'Alice Filter', employeeId: `EMP-A-${Date.now()}`, email: `alice-${Date.now()}@example.com`, role: 'employee', workInformation: { department: departmentA._id, branch: branchA._id, shiftId: shiftA._id, designation: 'Developer' } },
      { _id: id(), name: 'Bob Filter', employeeId: `EMP-B-${Date.now()}`, email: `bob-${Date.now()}@example.com`, role: 'employee', workInformation: { department: departmentB._id, branch: branchB._id, shiftId: shiftA._id, designation: 'Tester' } },
    ]);
    [contractorA, contractorB] = await User.create([
      { _id: id(), name: 'Contractor Alpha', employeeId: `CTR-A-${Date.now()}`, email: `ca-${Date.now()}@example.com`, role: 'contractor', isActive: 'Active', workInformation: { department: departmentA._id, branch: branchA._id } },
      { _id: id(), name: 'Contractor Beta', employeeId: `CTR-B-${Date.now()}`, email: `cb-${Date.now()}@example.com`, role: 'contractor', isActive: 'Relieved', workInformation: { department: departmentB._id, branch: branchB._id } },
    ]);
  });

  test('paysheet filters by month, status, search, department and pagination', async () => {
    await Payroll.create([
      { employeeId: employeeA._id, month: 10, year: 2026, status: 'processed', snapshot: { employee: { name: employeeA.name, employeeCode: employeeA.employeeId }, earnedWages: 100, grossEarnings: 100, takeHome: 100 } },
      { employeeId: employeeB._id, month: 10, year: 2026, status: 'draft', snapshot: { employee: { name: employeeB.name, employeeCode: employeeB.employeeId }, earnedWages: 200, grossEarnings: 200, takeHome: 200 } },
    ]);
    const base = { month: 10, year: 2026, status: 'processed', departmentId: departmentA._id.toString(), page: 1, limit: 1 };
    const response = await request(app).get('/v1/paysheets/list').query(base).set(auth(admin)).expect(200);
    expect(response.body.totalResults).toBe(1);
    expect(response.body.results[0].name).toBe(employeeA.name);
    await request(app).get('/v1/paysheets/list').query({ month: 10, year: 2026, search: 'does-not-exist' }).set(auth(admin)).expect(200).then((r) => expect(r.body.totalResults).toBe(0));
    await request(app).get('/v1/paysheets/list').query({ month: 10, year: 2026, departmentIds: `${departmentA._id},${departmentB._id}`, sortBy: 'name:asc' }).set(auth(admin)).expect(200).then((r) => expect(r.body.totalResults).toBe(2));
    await request(app).get('/v1/paysheets/list').query({ month: 10, year: 2026, departmentId: 'bad-id' }).set(auth(admin)).expect(400);
  });

  test('contractor filters return exact records and totals', async () => {
    const response = await request(app).get('/v1/contractors').query({ name: 'Alpha', status: 'Active', departmentId: departmentA._id.toString(), branchId: branchA._id.toString(), page: 1, limit: 1 }).set(auth(admin)).expect(200);
    expect(response.body.totalResults).toBe(1);
    expect(response.body.results[0].name).toBe(contractorA.name);
    await request(app).get('/v1/contractors').query({ status: 'Active', branchId: branchB._id.toString() }).set(auth(admin)).expect(200).then((r) => expect(r.body.totalResults).toBe(0));
    await request(app).get('/v1/contractors').query({ status: 'invalid' }).set(auth(admin)).expect(400);
  });

  test('settlement filters support contractor, period, status, dates and amount sorting', async () => {
    await ContractorSettlement.create([
      { contractorId: contractorA._id, month: 10, year: 2026, status: 'processed', totalShare: 500, processedAt: new Date('2026-10-05T00:00:00Z') },
      { contractorId: contractorB._id, month: 9, year: 2026, status: 'paid', totalShare: 900, processedAt: new Date('2026-09-05T00:00:00Z') },
    ]);
    const response = await request(app).get('/v1/contractor-settlements').query({ contractorId: contractorA._id.toString(), month: 10, year: 2026, status: 'processed', fromDate: '2026-10-01', toDate: '2026-10-31', sortBy: 'totalShare:desc', page: 1, limit: 1 }).set(auth(admin)).expect(200);
    expect(response.body.totalResults).toBe(1);
    expect(response.body.results[0].totalShare).toBe(500);
    await request(app).get('/v1/contractor-settlements').query({ contractorId: id().toString(), page: 1, limit: 10 }).set(auth(admin)).expect(200).then((r) => expect(r.body.totalResults).toBe(0));
    await request(app).get('/v1/contractor-settlements').query({ status: 'invalid' }).set(auth(admin)).expect(400);
  });
});
