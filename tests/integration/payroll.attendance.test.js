const mongoose = require('mongoose');
const setupTestDB = require('../utils/setupTestDB');
const { Attendance, Overtime, SalaryDetails, User } = require('../../src/models');
const payrollService = require('../../src/services/payroll.service');

setupTestDB();

describe('ATTENDANCE-05 payroll attendance reconciliation', () => {
  let employee;

  beforeEach(async () => {
    employee = await User.create({
      _id: new mongoose.Types.ObjectId(),
      name: 'Payroll Employee',
      email: `payroll-attendance-${Date.now()}@example.com`,
      role: 'employee',
    });
    const salary = await SalaryDetails.create({ basicSalary: 26000, monthlyCTC: 26000 });
    employee.workInformation.SalaryDetails = salary;
  });

  test('uses persisted fullDay, halfDay, and absent categories', async () => {
    await Attendance.create([
      { employeeId: employee._id, date: new Date('2026-05-01'), attendanceCategory: 'fullDay', totalWorkedHours: 1 },
      { employeeId: employee._id, date: new Date('2026-05-02'), attendanceCategory: 'halfDay', totalWorkedHours: 8 },
      { employeeId: employee._id, date: new Date('2026-05-03'), attendanceCategory: 'absent', totalWorkedHours: 8 },
    ]);
    const result = await payrollService.computePayrollForEmployee(employee, 5, 2026);
    expect(result).toMatchObject({ fullDays: 1, halfDays: 1, offDays: 1, legacyAttendanceRecords: 0 });
  });

  test('respects manual category override instead of worked hours', async () => {
    await Attendance.create({ employeeId: employee._id, date: new Date('2026-05-01'), attendanceCategory: 'halfDay', isManualOverride: true, totalWorkedHours: 8 });
    const result = await payrollService.computePayrollForEmployee(employee, 5, 2026);
    expect(result).toMatchObject({ fullDays: 0, halfDays: 1, offDays: 0 });
  });

  test('uses approved overtime only and ignores attendance OT fields', async () => {
    await Attendance.create({ employeeId: employee._id, date: new Date('2026-05-01'), attendanceCategory: 'fullDay', overTimeWorkedHours: 99, IsOverTimeWoked: true });
    await Overtime.create([
      { employeeId: employee._id, OvertimeDate: new Date('2026-05-01'), totalDuration: 2, status: 'approved' },
      { employeeId: employee._id, OvertimeDate: new Date('2026-05-02'), totalDuration: 5, status: 'pending' },
    ]);
    const result = await payrollService.computePayrollForEmployee(employee, 5, 2026);
    expect(result.overtimeAmount).toBeCloseTo(375, 2);
    expect(result).toMatchObject({ fullDays: 1, offDays: 0 });
  });

  test('does not silently classify legacy records without a category', async () => {
    await Attendance.create({ employeeId: employee._id, date: new Date('2026-05-01'), totalWorkedHours: 8 });
    const result = await payrollService.computePayrollForEmployee(employee, 5, 2026);
    expect(result).toMatchObject({ fullDays: 0, halfDays: 0, offDays: 0, legacyAttendanceRecords: 1 });
  });
});
