const mongoose = require('mongoose');
const setupTestDB = require('../utils/setupTestDB');
const { User, Overtime } = require('../../src/models');
const payrollService = require('../../src/services/payroll.service');
const attendanceService = require('../../src/services/attendance.service');
const { detectOverlappingOvertime } = require('../../src/services/overtimeOverlap.service');

setupTestDB();
const id = () => new mongoose.Types.ObjectId();
const record = (employeeId, start, end, status = 'approved', totalDuration = 1) => ({ employeeId, OvertimeDate: new Date(start), startTime: new Date(start), endTime: new Date(end), totalDuration, status });

describe('OVERTIME-02 legacy approved overlap protection', () => {
  let employee;
  beforeEach(async () => { employee = await User.create({ _id: id(), name: 'Overlap Employee', email: `overlap-${Date.now()}@example.com`, role: 'employee' }); });

  test('non-overlapping and adjacent approved records both count', async () => {
    const records = [record(employee._id, '2026-05-01T18:00:00Z', '2026-05-01T19:00:00Z'), record(employee._id, '2026-05-01T19:00:00Z', '2026-05-01T20:30:00Z', 'approved', 1.5)];
    expect(detectOverlappingOvertime(records).groups).toHaveLength(0);
    await Overtime.create(records);
    const result = await payrollService.computePayrollForEmployee(employee, 5, 2026);
    expect(result).toMatchObject({ overlappingOvertimeRecords: [], overlappingOvertimeDates: [] });
    expect(result.overtimeHours).toBeUndefined();
  });

  test('overlapping approved records are diagnosed and excluded from payroll', async () => {
    await Overtime.create([record(employee._id, '2026-05-01T18:00:00Z', '2026-05-01T20:00:00Z', 'approved', 2), record(employee._id, '2026-05-01T19:00:00Z', '2026-05-01T21:00:00Z', 'approved', 2), record(employee._id, '2026-05-02T18:00:00Z', '2026-05-02T19:00:00Z', 'approved', 1)]);
    const result = await payrollService.computePayrollForEmployee(employee, 5, 2026);
    expect(result.overlappingOvertimeRecords).toHaveLength(1);
    expect(result.overlappingOvertimeRecords[0].overlapDetected).toBe(true);
    expect(result.overlappingOvertimeDates).toContain('2026-05-01');
    expect(result.overlappingOvertimeRecords[0].ranges).toHaveLength(2);
  });

  test('overnight overlap is detected and non-approved records are ignored', async () => {
    const records = [record(employee._id, '2026-05-01T22:00:00Z', '2026-05-02T01:00:00Z', 'approved', 3), record(employee._id, '2026-05-02T00:30:00Z', '2026-05-02T02:00:00Z', 'approved', 1.5), record(employee._id, '2026-05-01T23:00:00Z', '2026-05-02T00:00:00Z', 'pending', 1), record(employee._id, '2026-05-01T23:00:00Z', '2026-05-02T00:00:00Z', 'rejected', 1), record(employee._id, '2026-05-01T23:00:00Z', '2026-05-02T00:00:00Z', 'cancelled', 1)];
    const diagnostic = detectOverlappingOvertime(records.filter((r) => r.status === 'approved'));
    expect(diagnostic.groups).toHaveLength(1);
    await Overtime.create(records);
    const summary = await attendanceService.getEmployeeAttendanceSummary(employee._id, '2026-05-01', '2026-05-02');
    expect(summary.overlappingOvertimeDates).toEqual(expect.arrayContaining(['2026-05-01', '2026-05-02']));
    expect(summary.overtimeHours).toBe(0);
  });

  test('diagnostics remain available after employee soft deletion', async () => {
    await Overtime.create([record(employee._id, '2026-05-03T18:00:00Z', '2026-05-03T20:00:00Z', 'approved', 2), record(employee._id, '2026-05-03T19:00:00Z', '2026-05-03T21:00:00Z', 'approved', 2)]);
    await User.updateOne({ _id: employee._id }, { isDeleted: true, deletedAt: new Date() });
    const result = await payrollService.computePayrollForEmployee(employee, 5, 2026);
    expect(result.overlappingOvertimeRecords).toHaveLength(1);
  });
});
