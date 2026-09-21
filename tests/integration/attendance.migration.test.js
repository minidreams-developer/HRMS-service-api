const mongoose = require('mongoose');
const setupTestDB = require('../utils/setupTestDB');
const { Attendance, User } = require('../../src/models');
const { auditAttendanceDays, applySafeBackfill, utcAttendanceDay } = require('../../src/services/attendanceDayMigration.service');

setupTestDB();

describe('ATTENDANCE-MIGRATION-01 attendanceDay audit/backfill', () => {
  let employee;
  beforeEach(async () => {
    employee = await User.create({ _id: new mongoose.Types.ObjectId(), name: 'Migration Employee', email: `migration-${Date.now()}@example.com`, role: 'employee' });
  });

  test('dry-run audits without writing', async () => {
    await Attendance.create({ employeeId: employee._id, date: new Date('2026-07-01T23:30:00.000Z'), attendanceCategory: 'fullDay' });
    const audit = await auditAttendanceDays();
    expect(audit.safeLegacyCount).toBe(1);
    expect(await Attendance.countDocuments({ attendanceDay: { $exists: true } })).toBe(0);
  });

  test('reports duplicates with full record details and skips them', async () => {
    await Attendance.create([
      { employeeId: employee._id, date: new Date('2026-07-02T01:00:00.000Z'), attendanceCategory: 'fullDay', loginTime: new Date('2026-07-02T09:00:00Z'), totalWorkedHours: 8 },
      { employeeId: employee._id, date: new Date('2026-07-02T22:00:00.000Z'), attendanceCategory: 'halfDay', logoutTime: new Date('2026-07-02T13:00:00Z'), totalWorkedHours: 3 },
    ]);
    const audit = await auditAttendanceDays();
    expect(audit.duplicateGroups).toHaveLength(1);
    expect(audit.duplicateGroups[0].records).toHaveLength(2);
    expect(audit.safeLegacyCount).toBe(0);
    const result = await applySafeBackfill(audit);
    expect(result).toMatchObject({ backfilledCount: 0, failedUpdateCount: 0 });
    expect(await Attendance.countDocuments({ attendanceDay: { $exists: true } })).toBe(0);
  });

  test('applies only safe legacy records, is UTC-correct, and idempotent', async () => {
    const record = await Attendance.create({ employeeId: employee._id, date: new Date('2026-07-03T23:59:59.999Z'), attendanceCategory: 'absent' });
    const first = await applySafeBackfill(await auditAttendanceDays());
    expect(first).toMatchObject({ backfilledCount: 1, failedUpdateCount: 0 });
    const updated = await Attendance.findById(record._id).lean();
    expect(updated.attendanceDay.toISOString()).toBe(utcAttendanceDay(record.date).toISOString());
    expect((await applySafeBackfill(await auditAttendanceDays())).backfilledCount).toBe(0);
  });
});
