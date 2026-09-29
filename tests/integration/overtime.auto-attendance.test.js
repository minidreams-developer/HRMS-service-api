const mongoose = require('mongoose');
const setupTestDB = require('../utils/setupTestDB');
const { Attendance, Overtime, Shift, User } = require('../../src/models');
const attendanceService = require('../../src/services/attendance.service');

setupTestDB();

describe('OVERTIME-AUTO-01 attendance generation', () => {
  let employee;
  let shift;
  const day = '2026-02-10';

  beforeEach(async () => {
    employee = await User.create({ _id: new mongoose.Types.ObjectId(), name: 'OT Employee', email: `ot-${Date.now()}-${Math.random()}@example.com`, role: 'employee' });
    shift = await Shift.create({ shiftName: 'OT Shift', minWorkingHours: '8h', halfDayWorkingHours: '4h', overtimeAfterHours: 8, timings: [] });
  });

  const attendance = (logout = '18:00') => attendanceService.createAttendance({
    employeeId: employee._id,
    shiftId: shift._id,
    date: day,
    loginTime: `${day}T09:00:00.000Z`,
    logoutTime: `${day}T${logout}:00.000Z`,
  }, employee._id);

  test('snapshots threshold and creates one pending linked request for excess hours', async () => {
    const record = await attendance();
    const requests = await Overtime.find({ attendanceId: record._id }).lean();
    expect(record.shiftSnapshot.overtimeAfterHours).toBe(8);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ source: 'attendance', generatedBySystem: true, status: 'pending', attendanceId: record._id });
    expect(requests[0].totalDuration).toBe(1);
  });

  test('is idempotent and updates pending OT when attendance is edited', async () => {
    const record = await attendance();
    await attendanceService.updateAttendanceById(record._id, { logoutTime: `${day}T19:00:00.000Z` }, employee._id);
    const requests = await Overtime.find({ attendanceId: record._id }).lean();
    expect(requests).toHaveLength(1);
    expect(requests[0].totalDuration).toBe(2);
  });

  test('cancels pending OT when excess disappears and preserves approved history', async () => {
    const record = await attendance();
    const request = await Overtime.findOne({ attendanceId: record._id });
    request.status = 'approved';
    await request.save();
    await attendanceService.updateAttendanceById(record._id, { logoutTime: `${day}T16:00:00.000Z` }, employee._id);
    const saved = await Overtime.findById(request._id).lean();
    expect(saved.status).toBe('approved');
    expect(saved.totalDuration).toBe(1);
  });
});
