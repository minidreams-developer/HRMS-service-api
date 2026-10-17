const mongoose = require('mongoose');
const { User, Payroll } = require('../../src/models');
const setupTestDB = require('../utils/setupTestDB');
const payrollService = require('../../src/services/payroll.service');

setupTestDB();
const id = () => new mongoose.Types.ObjectId();

describe('PAYHUB-STOP-PAYROLL-CROSSMONTH-01', () => {
  test('lists only payrolls with current or historical stop state and paginates filtered rows', async () => {
    const employees = await User.create(Array.from({ length: 5 }, (_, index) => ({
      _id: id(), name: `Stop List Employee ${index}`, employeeId: `EMP-STOP-${index}`,
      email: `stop-list-${Date.now()}-${index}@example.com`, role: index === 4 ? 'staff' : 'employee', isActive: 'Active',
    })));
    const stopDetails = { stopType: 'hold', reason: 'Review', effectiveFrom: new Date('2026-10-01'), stoppedAt: new Date('2026-10-01') };
    await Payroll.create([
      { employeeId: employees[0]._id, month: 10, year: 2026, status: 'stopped' },
      { employeeId: employees[1]._id, month: 10, year: 2026, status: 'resumed', stopDetails: { ...stopDetails, resumedAt: new Date('2026-10-05') } },
      { employeeId: employees[2]._id, month: 10, year: 2026, status: 'paid', totalSalary: 30000, deductions: 500, totalPayableAmount: 2500, stopDetails: { ...stopDetails, resumedAt: new Date('2026-10-05') }, snapshot: { grossWages: 30000, grossEarnings: 3000, takeHome: 2500, fullDays: 10, halfDays: 1 } },
      { employeeId: employees[3]._id, month: 10, year: 2026, status: 'processed' },
      { employeeId: employees[4]._id, month: 10, year: 2026, status: 'paid' },
    ]);

    const result = await payrollService.getStopPayrollList({ month: 10, year: 2026 }, { page: 1, limit: 2 });
    expect(result.totalResults).toBe(3);
    expect(result.totalPages).toBe(2);
    expect(result.results).toHaveLength(2);
    expect(result.results.every((row) => ['stopped', 'resumed', 'paid'].includes(row.status))).toBe(true);

    const pageTwo = await payrollService.getStopPayrollList({ month: 10, year: 2026 }, { page: 2, limit: 2 });
    expect(pageTwo.results).toHaveLength(1);
    expect(pageTwo.totalResults).toBe(3);
    const paidHistory = [...result.results, ...pageTwo.results].find((row) => row.employeeId.toString() === employees[2]._id.toString());
    expect(paidHistory).toMatchObject({ currentMonthSalary: 30000, deductions: 500, payableAfterStop: 2500 });
    expect(paidHistory.days).toEqual({ fullDays: 10, halfDays: 1, total: 10.5 });
    expect((await payrollService.getStopPayrollList({ month: 10, year: 2026, role: 'staff' }, { page: 1, limit: 10 })).totalResults).toBe(0);
    expect((await payrollService.getStopPayrollList({ month: 10, year: 2026, status: 'processed' }, { page: 1, limit: 10 })).totalResults).toBe(0);
  });

  test('keeps stopped September and normal October payroll independent', async () => {
    const [admin, employee] = await User.create([
      { _id: id(), name: 'Cross Month Admin', email: `cross-admin-${Date.now()}@example.com`, role: 'admin', isActive: 'Active' },
      { _id: id(), name: 'Cross Month Employee', employeeId: 'EMP-CROSS', email: `cross-employee-${Date.now()}@example.com`, role: 'employee', isActive: 'Active' },
    ]);
    const september = await payrollService.processPayroll(employee._id, 9, 2026, admin._id);
    await payrollService.stopPayroll(employee._id, { month: 9, year: 2026, stopType: 'hold', reason: 'Review', effectiveFrom: '2026-09-20', impactMonth: 'September 2026' });
    const stats = await payrollService.getStopPayrollQuickStats({ month: 9, year: 2026 });
    expect(stats).toMatchObject({ stoppedPayrolls: 1, releasedPayrolls: 0 });
    const october = await payrollService.processPayroll(employee._id, 10, 2026, admin._id);
    expect(String(september.payrollId)).not.toBe(String(october.payrollId));

    const octoberBefore = await Payroll.findById(october.payrollId).lean();
    const septemberStopped = await Payroll.findOne({ employeeId: employee._id, month: 9, year: 2026 });
    expect(septemberStopped.status).toBe('stopped');
    expect(septemberStopped.stopDetails.reason).toBe('Review');

    await payrollService.resumePayroll(employee._id, 9, 2026, 'Released in October');
    await payrollService.updatePayrollStatus(september.payrollId, 'processed', admin._id);
    await payrollService.updatePayrollStatus(september.payrollId, 'paid', admin._id);
    await payrollService.updatePayrollStatus(october.payrollId, 'paid', admin._id);

    const [septemberPaid, octoberPaid] = await Promise.all([
      Payroll.findById(september.payrollId).lean(), Payroll.findById(october.payrollId).lean(),
    ]);
    expect(septemberPaid).toMatchObject({ month: 9, year: 2026, status: 'paid' });
    expect(octoberPaid).toMatchObject({ month: 10, year: 2026, status: 'paid' });
    expect(octoberPaid.snapshot).toEqual(octoberBefore.snapshot);
    expect(septemberPaid.snapshot.takeHome).toBe(septemberStopped.snapshot.takeHome);
    expect(await Payroll.countDocuments({ employeeId: employee._id })).toBe(2);
    expect(await payrollService.getPayslip(september.payrollId)).toMatchObject({ payslip: { month: 9, year: 2026 } });
    expect(await payrollService.getPayslip(october.payrollId)).toMatchObject({ payslip: { month: 10, year: 2026 } });
  });
});
