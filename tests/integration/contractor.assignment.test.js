const mongoose = require('mongoose');
const setupTestDB = require('../utils/setupTestDB');
const { User } = require('../../src/models');
const assignment = require('../../src/services/contractorWorkerAssignment.service');

setupTestDB(); const id = () => new mongoose.Types.ObjectId();
describe('CONTRACTOR-01 assignments', () => {
  let admin; let worker; let staff; let contractorA; let contractorB;
  beforeEach(async () => {
    [admin, worker, staff, contractorA, contractorB] = await User.create([
      { _id: id(), name: 'Admin', email: `ca-admin-${Date.now()}@x.com`, role: 'admin' },
      { _id: id(), name: 'Worker', email: `ca-worker-${Date.now()}@x.com`, role: 'employee' },
      { _id: id(), name: 'Staff', email: `ca-staff-${Date.now()}@x.com`, role: 'staff' },
      { _id: id(), name: 'Contractor A', email: `ca-a-${Date.now()}@x.com`, role: 'contractor' },
      { _id: id(), name: 'Contractor B', email: `ca-b-${Date.now()}@x.com`, role: 'contractor' },
    ]);
  });
  test('supports employee/staff assignments and effective historical resolution', async () => {
    const first = await assignment.create({ workerId: worker._id, contractorId: contractorA._id, effectiveFrom: '2026-01-01', effectiveTo: '2026-06-30', sharePercentage: 5 }, admin._id);
    await expect(assignment.create({ workerId: worker._id, contractorId: contractorB._id, effectiveFrom: '2026-06-15', sharePercentage: 7 }, admin._id)).rejects.toMatchObject({ statusCode: 409 });
    const second = await assignment.create({ workerId: worker._id, contractorId: contractorB._id, effectiveFrom: '2026-07-01', sharePercentage: 7 }, admin._id);
    expect(String((await assignment.getForDate(worker._id, '2026-06-30')).contractorId)).toBe(String(contractorA._id));
    expect(String((await assignment.getForDate(worker._id, '2026-07-01')).contractorId)).toBe(String(contractorB._id));
    expect((await assignment.history(worker._id))).toHaveLength(2); expect(first.sharePercentage).toBe(5); expect(second.sharePercentage).toBe(7);
    await assignment.create({ workerId: staff._id, contractorId: contractorA._id, effectiveFrom: '2026-01-01', sharePercentage: 4 }, admin._id);
  });
  test('rejects invalid share and inactive parties', async () => {
    await expect(assignment.create({ workerId: worker._id, contractorId: contractorA._id, effectiveFrom: '2026-01-01', sharePercentage: 101 }, admin._id)).rejects.toThrow();
    contractorA.isActive = 'In-Active'; await contractorA.save();
    await expect(assignment.create({ workerId: worker._id, contractorId: contractorA._id, effectiveFrom: '2026-01-01', sharePercentage: 5 }, admin._id)).rejects.toThrow('active contractor');
  });
});
