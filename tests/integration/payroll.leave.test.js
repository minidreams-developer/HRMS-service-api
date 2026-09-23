const mongoose = require('mongoose');
const setupTestDB = require('../utils/setupTestDB');
const { User, LeaveRequests, LeaveBalance, Shift, Holiday } = require('../../src/models');
const payrollService = require('../../src/services/payroll.service');

setupTestDB();

const id = () => new mongoose.Types.ObjectId();
const salaryEmployee = async (shiftId = null) => User.create({
  _id: id(),
  name: 'Payroll Leave Employee',
  email: `payroll-leave-${Date.now()}-${Math.random()}@example.com`,
  role: 'employee',
  workInformation: { shiftId },
});

describe('LEAVE-04 payroll reconciliation', () => {
  test('uses approved configured paid leave and ignores other statuses', async () => {
    const employee = await salaryEmployee();
    await LeaveBalance.create({ employeeId: employee._id, leaveType: 'Custom Paid', year: 2026, allocated: 5, isPaid: true, requiresBalance: true });
    await LeaveRequests.create({ employeeId: employee._id, leaveType: 'Custom Paid', singleDate: '2026-06-05', status: 'approved', leaveDuration: 'fullDay' });
    for (const status of ['pending', 'rejected', 'cancelled', 'ended']) {
      await LeaveRequests.create({ employeeId: employee._id, leaveType: 'Custom Paid', singleDate: `2026-06-${String(6 + ['pending', 'rejected', 'cancelled', 'ended'].indexOf(status)).padStart(2, '0')}`, status, leaveDuration: 'fullDay' });
    }
    const result = await payrollService.computePayrollForEmployee(employee, 6, 2026);
    expect(result.paidLeaves).toBe(1);
    expect(result.unpaidLeaves).toBe(0);
  });

  test('uses explicit unpaid behavior and reports unknown legacy types', async () => {
    const employee = await salaryEmployee();
    await LeaveRequests.create({ employeeId: employee._id, leaveType: 'Unpaid Leave', singleDate: '2026-06-05', status: 'approved', leaveDuration: 'fullDay' });
    await LeaveRequests.create({ employeeId: employee._id, leaveType: 'Legacy Mystery', singleDate: '2026-06-06', status: 'approved', leaveDuration: 'fullDay' });
    const result = await payrollService.computePayrollForEmployee(employee, 6, 2026);
    expect(result.unpaidLeaves).toBe(1);
    expect(result.unclassifiedLeaves).toBe(1);
    expect(result.unclassifiedLeaveDays).toBe(1);
  });

  test('counts half-day as 0.5 and excludes holiday and week-off', async () => {
    const shift = await Shift.create({ shiftName: 'Payroll Shift', weekOff: ['Sunday'] });
    const employee = await salaryEmployee(shift._id);
    await LeaveBalance.create({ employeeId: employee._id, leaveType: 'Custom Paid', year: 2026, allocated: 5, isPaid: true, requiresBalance: true });
    await LeaveRequests.create({ employeeId: employee._id, leaveType: 'Custom Paid', singleDate: '2026-06-05', status: 'approved', leaveDuration: 'halfDay', halfDaySession: 'firstHalf' });
    await LeaveRequests.create({ employeeId: employee._id, leaveType: 'Custom Paid', singleDate: '2026-06-07', status: 'approved', leaveDuration: 'fullDay' });
    await Holiday.create({ holidayTitle: 'Payroll Holiday', date: '2026-06-08', status: true, people: [employee._id] });
    await LeaveRequests.create({ employeeId: employee._id, leaveType: 'Custom Paid', singleDate: '2026-06-08', status: 'approved', leaveDuration: 'fullDay' });
    const result = await payrollService.computePayrollForEmployee(employee, 6, 2026);
    expect(result.paidLeaves).toBe(0.5);
  });

  test('counts only the payroll-period portion of cross-month and full-month ranges', async () => {
    const employee = await salaryEmployee();
    await LeaveBalance.create({ employeeId: employee._id, leaveType: 'Custom Paid', year: 2026, allocated: 20, isPaid: true, requiresBalance: true });
    await LeaveRequests.create({ employeeId: employee._id, leaveType: 'Custom Paid', startDate: '2026-05-28', endDate: '2026-06-03', status: 'approved', leaveDuration: 'fullDay' });
    await LeaveRequests.create({ employeeId: employee._id, leaveType: 'Custom Paid', startDate: '2026-06-10', endDate: '2026-06-30', status: 'approved', leaveDuration: 'fullDay' });
    const result = await payrollService.computePayrollForEmployee(employee, 6, 2026);
    expect(result.paidLeaves).toBe(24);
  });

  test('handles cross-year leave by payroll period', async () => {
    const employee = await salaryEmployee();
    await LeaveBalance.create({ employeeId: employee._id, leaveType: 'Custom Paid', year: 2026, allocated: 5, isPaid: true, requiresBalance: true });
    await LeaveBalance.create({ employeeId: employee._id, leaveType: 'Custom Paid', year: 2027, allocated: 5, isPaid: true, requiresBalance: true });
    await LeaveRequests.create({ employeeId: employee._id, leaveType: 'Custom Paid', startDate: '2026-12-30', endDate: '2027-01-02', status: 'approved', leaveDuration: 'fullDay' });
    const december = await payrollService.computePayrollForEmployee(employee, 12, 2026);
    const january = await payrollService.computePayrollForEmployee(employee, 1, 2027);
    expect(december.paidLeaves).toBe(2);
    expect(january.paidLeaves).toBe(2);
  });

  test('does not mutate LeaveBalance.used', async () => {
    const employee = await salaryEmployee();
    const balance = await LeaveBalance.create({ employeeId: employee._id, leaveType: 'Custom Paid', year: 2026, allocated: 5, used: 1, isPaid: true, requiresBalance: true });
    await LeaveRequests.create({ employeeId: employee._id, leaveType: 'Custom Paid', singleDate: '2026-06-05', status: 'approved', leaveDuration: 'fullDay' });
    await payrollService.computePayrollForEmployee(employee, 6, 2026);
    const refreshed = await LeaveBalance.findById(balance._id);
    expect(refreshed.used).toBe(1);
  });
});
