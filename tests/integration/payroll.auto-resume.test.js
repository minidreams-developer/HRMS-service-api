const mongoose = require('mongoose');
const setupTestDB = require('../utils/setupTestDB');
const { User, Payroll } = require('../../src/models');
const payrollService = require('../../src/services/payroll.service');

setupTestDB();

const objectId = () => new mongoose.Types.ObjectId();

describe('PAYHUB-AUTO-RESUME-01 scheduled payroll resume', () => {
  let employee;

  beforeEach(async () => {
    employee = await User.create({
      _id: objectId(), name: 'Resume Employee', employeeId: `RES-${Date.now()}`,
      email: `resume-${Date.now()}@example.com`, role: 'employee',
    });
  });

  const stoppedPayroll = (month, resumeOn, status = 'stopped') => Payroll.create({
    employeeId: employee._id,
    month,
    year: 2026,
    status,
    totalPayableAmount: 1000,
    stopDetails: {
      stopType: 'temporary',
      reason: 'testing',
      effectiveFrom: new Date('2026-10-01T00:00:00.000Z'),
      resumeOn,
      impactMonth: 'October 2026',
      stopRemarks: 'hold',
      stoppedAt: new Date('2026-10-01T00:00:00.000Z'),
    },
  });

  test('resumes due payrolls and preserves schedule/stop data', async () => {
    const now = new Date('2026-10-14T10:00:00.000Z');
    const payroll = await stoppedPayroll(10, new Date('2026-10-14T09:00:00.000Z'));

    await expect(payrollService.resumeDuePayrolls(now)).resolves.toEqual({ matched: 1, resumed: 1 });
    const updated = await Payroll.findById(payroll._id).lean();
    expect(updated.status).toBe('resumed');
    expect(updated.stopDetails.resumeOn).toEqual(new Date('2026-10-14T09:00:00.000Z'));
    expect(updated.stopDetails.resumedAt).toEqual(now);
    expect(updated.stopDetails.resumeSource).toBe('automatic');
    expect(updated.stopDetails.stopRemarks).toBe('hold');
    expect(updated.stopDetails.resumeRemarks).toMatch(/automatically resumed/i);
  });

  test('ignores future, missing-date, and already-resumed payrolls', async () => {
    const now = new Date('2026-10-14T10:00:00.000Z');
    await stoppedPayroll(10, new Date('2026-10-15T00:00:00.000Z'));
    await stoppedPayroll(11, null);
    await stoppedPayroll(12, new Date('2026-10-13T00:00:00.000Z'), 'resumed');

    await expect(payrollService.resumeDuePayrolls(now)).resolves.toEqual({ matched: 0, resumed: 0 });
    expect(await Payroll.countDocuments({ status: 'stopped' })).toBe(2);
  });

  test('is idempotent when called repeatedly', async () => {
    const now = new Date('2026-10-14T10:00:00.000Z');
    await stoppedPayroll(10, new Date('2026-10-14T09:00:00.000Z'));
    expect(await payrollService.resumeDuePayrolls(now)).toEqual({ matched: 1, resumed: 1 });
    expect(await payrollService.resumeDuePayrolls(now)).toEqual({ matched: 0, resumed: 0 });
  });
});
