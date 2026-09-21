const mongoose = require('mongoose');
const setupTestDB = require('../utils/setupTestDB');
const { Attendance, User } = require('../../src/models');
const attendanceService = require('../../src/services/attendance.service');
const payrollService = require('../../src/services/payroll.service');

setupTestDB();

describe('ATTENDANCE-06 duplicate attendance protection', () => {
  let employee; let otherEmployee;
  beforeEach(async () => {
    [employee, otherEmployee] = await User.create([
      { _id: new mongoose.Types.ObjectId(), name: 'Duplicate Employee', email: `dup-${Date.now()}@example.com`, role: 'employee' },
      { _id: new mongoose.Types.ObjectId(), name: 'Other Employee', email: `dup-other-${Date.now()}@example.com`, role: 'employee' },
    ]);
  });

  const absent = (employeeId, date) => attendanceService.createAttendance({ employeeId, date, attendanceCategory: 'absent' });

  test('rejects same employee/date, normalizes UTC day, and allows other employee/date', async () => {
    await absent(employee._id, '2026-06-01T01:00:00.000Z');
    await expect(absent(employee._id, '2026-06-01T23:00:00.000Z')).rejects.toMatchObject({ statusCode: 409 });
    await expect(absent(employee._id, '2026-06-02T00:00:00.000Z')).resolves.toBeDefined();
    await expect(absent(otherEmployee._id, '2026-06-01T23:00:00.000Z')).resolves.toBeDefined();
  });

  test('rejects editing a date into another employee/date record', async () => {
    const first = await absent(employee._id, '2026-06-01T12:00:00.000Z');
    await absent(employee._id, '2026-06-02T12:00:00.000Z');
    await expect(attendanceService.updateAttendanceById(first._id, { date: '2026-06-02', editReason: 'Correction' }, new mongoose.Types.ObjectId())).rejects.toMatchObject({ statusCode: 409 });
  });

  test('reports legacy duplicates without deleting or selecting an authoritative record', async () => {
    await Attendance.create([
      { employeeId: employee._id, date: new Date('2026-06-03T01:00:00.000Z'), attendanceCategory: 'fullDay' },
      { employeeId: employee._id, date: new Date('2026-06-03T22:00:00.000Z'), attendanceCategory: 'halfDay' },
    ]);
    const summary = await attendanceService.getEmployeeAttendanceSummary(employee._id, '2026-06-03', '2026-06-03');
    expect(summary.duplicateAttendanceDates).toEqual([{ date: '2026-06-03', count: 2 }]);
    expect(summary.fullDays + summary.halfDays + summary.absent).toBe(0);
    const calendar = await attendanceService.getEmployeeCalendar(employee._id, '2026-06-03', '2026-06-03');
    expect(calendar[0].category).toBe('duplicate');
    expect(calendar[0].duplicateAttendanceCount).toBe(2);
    expect(await Attendance.countDocuments({ employeeId: employee._id })).toBe(2);
  });

  test('payroll excludes ambiguous duplicate dates and reports them', async () => {
    await Attendance.create([
      { employeeId: employee._id, date: new Date('2026-06-04T01:00:00.000Z'), attendanceCategory: 'fullDay' },
      { employeeId: employee._id, date: new Date('2026-06-04T22:00:00.000Z'), attendanceCategory: 'halfDay' },
      { employeeId: employee._id, date: new Date('2026-06-05'), attendanceCategory: 'fullDay' },
    ]);
    const result = await payrollService.computePayrollForEmployee(employee, 6, 2026);
    expect(result.duplicateAttendanceDates).toEqual([{ date: '2026-06-04', count: 2 }]);
    expect(result.fullDays).toBe(1);
    expect(result.halfDays).toBe(0);
  });

  test('soft-deleted employee history remains available', async () => {
    await absent(employee._id, '2026-06-06');
    await User.updateOne({ _id: employee._id }, { isDeleted: true, deletedAt: new Date() });
    const result = await attendanceService.getEmployeeAttendance(employee._id, { date: '2026-06-06' }, {});
    expect(result.totalResults).toBe(1);
  });
});
