const mongoose = require('mongoose');
const setupTestDB = require('../utils/setupTestDB');
const { User, Payroll, ContractorSettlement } = require('../../src/models');
const assignment = require('../../src/services/contractorWorkerAssignment.service');
const settlement = require('../../src/services/contractorSettlement.service');

setupTestDB(); const id = () => new mongoose.Types.ObjectId();
describe('CONTRACTOR-01 settlements', () => {
  let admin; let worker; let contractor;
  beforeEach(async () => {
    [admin, worker, contractor] = await User.create([
      { _id: id(), name: 'Admin', email: `cs-admin-${Date.now()}@x.com`, role: 'admin' },
      { _id: id(), name: 'Worker', employeeId: 'EMP-CS', email: `cs-worker-${Date.now()}@x.com`, role: 'employee' },
      { _id: id(), name: 'Contractor', employeeId: 'CTR-CS', email: `cs-contractor-${Date.now()}@x.com`, role: 'contractor' },
    ]);
    await assignment.create({ workerId: worker._id, contractorId: contractor._id, effectiveFrom: '2026-09-01', sharePercentage: 5 }, admin._id);
  });
  test('uses processed Payroll.snapshot.earnedWages and locks paid settlement', async () => {
    const payroll = await Payroll.create({ employeeId: worker._id, month: 9, year: 2026, status: 'processed', snapshot: { earnedWages: 20000 } });
    const result = await settlement.process(contractor._id, 9, 2026, admin._id);
    expect(result.totalShare).toBe(1000); expect(result.workerItems[0].payrollId.toString()).toBe(payroll._id.toString());
    const paid = await settlement.markPaid(result._id, admin._id); expect(paid.status).toBe('paid');
    await expect(settlement.process(contractor._id, 9, 2026, admin._id)).rejects.toThrow('immutable');
  });
  test('skips draft or missing payroll and does not calculate from salary', async () => {
    await Payroll.create({ employeeId: worker._id, month: 9, year: 2026, status: 'draft', snapshot: { earnedWages: 20000 } });
    const result = await settlement.process(contractor._id, 9, 2026, admin._id);
    expect(result.workerItems).toHaveLength(0); expect(result.skippedWorkers[0].reason).toBe('Payroll not processed');
  });
});
