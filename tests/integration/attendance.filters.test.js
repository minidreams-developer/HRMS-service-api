const mongoose = require('mongoose');
const setupTestDB = require('../utils/setupTestDB');
const { Attendance, Department, Shift, User } = require('../../src/models');
const attendanceService = require('../../src/services/attendance.service');

setupTestDB();
const id = () => new mongoose.Types.ObjectId();

describe('ATTENDANCE-FILTER-01 department and shift filters', () => {
  let milling; let other; let shift; let otherShift; let millingEmployee; let otherEmployee;
  beforeEach(async () => {
    [milling, other] = await Department.create([{ departmentName: 'Milling' }, { departmentName: 'Assembly' }]);
    [shift, otherShift] = await Shift.create([{ shiftName: 'Test Shift' }, { shiftName: 'Other Shift' }]);
    [millingEmployee, otherEmployee] = await User.create([
      { _id: id(), name: 'Milling Employee', email: `af-m-${Date.now()}@example.com`, role: 'employee', workInformation: { department: milling._id, shiftId: shift._id } },
      { _id: id(), name: 'Assembly Employee', email: `af-a-${Date.now()}@example.com`, role: 'employee', workInformation: { department: other._id, shiftId: otherShift._id } },
    ]);
    await Attendance.create([
      { employeeId: millingEmployee._id, date: '2026-09-01', shiftId: shift._id, attendanceCategory: 'fullDay' },
      { employeeId: otherEmployee._id, date: '2026-09-01', shiftId: otherShift._id, attendanceCategory: 'fullDay' },
    ]);
  });

  test('filters by department and shift names, including combined filters', async () => {
    const department = await attendanceService.queryAttendances({ role: 'employee', department: 'milling' }, { page: 1, limit: 10 });
    expect(department.totalResults).toBe(1);
    const shiftResult = await attendanceService.queryAttendances({ role: 'employee', shift: 'test shift' }, { page: 1, limit: 10 });
    expect(shiftResult.totalResults).toBe(1);
    const combined = await attendanceService.queryAttendances({ role: 'employee', department: 'Milling', shift: 'Test Shift' }, { page: 1, limit: 10 });
    expect(combined.totalResults).toBe(1);
    expect(String(combined.results[0].employeeId._id)).toBe(String(millingEmployee._id));
  });

  test('supports ID filters and applies filtering before pagination', async () => {
    const result = await attendanceService.queryAttendances({ departmentId: milling._id.toString(), shiftId: shift._id.toString() }, { page: 1, limit: 1 });
    expect(result.totalResults).toBe(1);
    expect(result.results).toHaveLength(1);
  });
});
