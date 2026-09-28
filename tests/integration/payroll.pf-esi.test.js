const mongoose = require('mongoose');
const setupTestDB = require('../utils/setupTestDB');
const { User, SalaryDetails, Payroll } = require('../../src/models');
const payrollService = require('../../src/services/payroll.service');

setupTestDB();
const id = () => new mongoose.Types.ObjectId();

describe('PAYROLL-PF-ESI-02 separate PF and ESI totals', () => {
  let employee; let staff;
  beforeEach(async () => {
    [employee, staff] = await User.create([
      { _id: id(), name: 'PF Employee', email: `pf-e-${Date.now()}@example.com`, role: 'employee' },
      { _id: id(), name: 'PF Staff', email: `pf-s-${Date.now()}@example.com`, role: 'staff' },
    ]);
    const employeeSalary = await SalaryDetails.create({ monthlyCTC: 26000, pfAmount: 1800, esiAmount: 450 });
    const staffSalary = await SalaryDetails.create({ monthlyCTC: 24000, pfAmount: 1500, esiAmount: 300 });
    employee.workInformation.SalaryDetails = employeeSalary._id;
    staff.workInformation.SalaryDetails = staffSalary._id;
    await employee.save(); await staff.save();
  });

  test('copies separate PF and ESI into payroll and uses them in deductions once', async () => {
    const result = await payrollService.processPayroll(employee._id, 9, 2026);
    const saved = await Payroll.findById(result.payrollId).lean();
    expect(saved.pfAmount).toBe(1800);
    expect(saved.esiAmount).toBe(450);
    expect(result.totalDeductions).toBe(2250);
    expect(result.takeHome).toBe(result.grossEarnings - 2250);
  });

  test('list summary totals use payroll snapshots, filters employee/staff, and missing legacy values are zero', async () => {
    await Payroll.create({ employeeId: employee._id, month: 9, year: 2026, pfAmount: 1800, esiAmount: 450 });
    await Payroll.create({ employeeId: staff._id, month: 9, year: 2026 });
    const all = await payrollService.getPayrollList({ month: 9, year: 2026 }, { page: 1, limit: 10 });
    expect(all.totalPfAmount).toBe(1800);
    expect(all.totalEsiAmount).toBe(450);
    const staffOnly = await payrollService.getPayrollList({ month: 9, year: 2026, role: 'staff' }, { page: 1, limit: 10 });
    expect(staffOnly.results).toHaveLength(1);
    expect(staffOnly.totalPfAmount).toBe(0);
    expect(staffOnly.totalEsiAmount).toBe(0);
  });

  test('historical payroll values remain unchanged when salary configuration changes', async () => {
    const processed = await payrollService.processPayroll(employee._id, 9, 2026);
    await SalaryDetails.updateOne({ _id: employee.workInformation.SalaryDetails }, { $set: { pfAmount: 2000, esiAmount: 700 } });
    const detail = await payrollService.getEmployeePayroll(employee._id, 9, 2026);
    expect(detail.pfAmount).toBe(1800);
    expect(detail.esiAmount).toBe(450);
    expect(String(detail.payrollId)).toBe(String(processed.payrollId));
  });
});
