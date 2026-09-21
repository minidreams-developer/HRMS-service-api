const mongoose = require('mongoose');
const setupTestDB = require('../utils/setupTestDB');
const { Attendance, Overtime, Shift, User } = require('../../src/models');
const attendanceService = require('../../src/services/attendance.service');
const userService = require('../../src/services/user.service');
const { updateShift, createShift } = require('../../src/validations/shift.validation');

setupTestDB();

const employeeId = () => new mongoose.Types.ObjectId();
const day = '2026-01-15';
const times = (login, logout) => ({
  loginTime: `${day}T${login}:00.000Z`,
  logoutTime: `${day}T${logout}:00.000Z`,
});

const validShift = (overrides = {}) => ({
  shiftName: 'Foundation Shift',
  minWorkingHours: '8h',
  halfDayWorkingHours: '4h',
  breakManagement: { enabled: true, duration: 60 },
  timings: [{ day: 'Monday', startTime: '09:00', endTime: '18:00' }],
  ...overrides,
});

describe('ATTENDANCE-01 foundation', () => {
  let shift;
  let employee;

  beforeEach(async () => {
    shift = await Shift.create(validShift());
    employee = await User.create({
      _id: employeeId(),
      name: 'Attendance Employee',
      email: `attendance-${Date.now()}-${Math.random()}@example.com`,
      role: 'employee',
    });
  });

  test('calculates full day from net worked hours', async () => {
    const record = await attendanceService.createAttendance({
      employeeId: employee._id,
      shiftId: shift._id,
      date: day,
      ...times('09:00', '18:00'),
    });

    expect(record.totalWorkedHours).toBe(8);
    expect(record.attendanceCategory).toBe('fullDay');
  });

  test('calculates half day from shift thresholds', async () => {
    const record = await attendanceService.createAttendance({
      employeeId: employee._id,
      shiftId: shift._id,
      date: day,
      ...times('09:00', '14:00'),
    });

    expect(record.totalWorkedHours).toBe(4);
    expect(record.attendanceCategory).toBe('halfDay');
  });

  test('saves an explicit absent record without times', async () => {
    const record = await attendanceService.createAttendance({
      employeeId: employee._id,
      shiftId: shift._id,
      date: day,
      attendanceCategory: 'absent',
      loginTime: null,
      logoutTime: null,
    });

    expect(record.attendanceCategory).toBe('absent');
    expect(record.totalWorkedHours).toBe(0);
    expect(record.loginTime).toBeNull();
    expect(record.logoutTime).toBeNull();
  });

  test('classifies below half-day threshold as absent', async () => {
    const record = await attendanceService.createAttendance({
      employeeId: employee._id,
      shiftId: shift._id,
      date: day,
      ...times('09:00', '12:00'),
    });

    expect(record.totalWorkedHours).toBe(2);
    expect(record.attendanceCategory).toBe('absent');
  });

  test('deducts fixed break duration in minutes and ignores supplied hours', async () => {
    const record = await attendanceService.createAttendance({
      employeeId: employee._id,
      shiftId: shift._id,
      date: day,
      ...times('09:00', '17:00'),
      totalWorkedHours: 99,
    });

    expect(record.totalWorkedHours).toBe(7);
    expect(record.totalWorkedHours).not.toBe(99);
  });

  test('rejects logout before login', async () => {
    await expect(attendanceService.createAttendance({
      employeeId: employee._id,
      shiftId: shift._id,
      date: day,
      ...times('18:00', '09:00'),
    })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects working attendance when half-day threshold is missing', async () => {
    const legacyShift = await Shift.create(validShift({ halfDayWorkingHours: undefined }));

    await expect(attendanceService.createAttendance({
      employeeId: employee._id,
      shiftId: legacyShift._id,
      date: day,
      ...times('09:00', '18:00'),
    })).rejects.toThrow('halfDayWorkingHours');
  });

  test('keeps legacy timing status records readable', async () => {
    const legacy = await Attendance.create({
      employeeId: employee._id,
      shiftId: shift._id,
      date: day,
      attendanceStatus: 'arrivedLate',
    });
    const loaded = await attendanceService.getAttendanceById(legacy._id);

    expect(loaded.attendanceStatus).toBe('arrivedLate');
    expect(loaded.timingStatus).toBeUndefined();
  });

  test('does not create or approve overtime from attendance', async () => {
    await attendanceService.createAttendance({
      employeeId: employee._id,
      shiftId: shift._id,
      date: day,
      ...times('09:00', '20:00'),
    });

    expect(await Overtime.countDocuments({ employeeId: employee._id })).toBe(0);
  });

  test('retains attendance after employee soft deletion', async () => {
    const record = await attendanceService.createAttendance({
      employeeId: employee._id,
      shiftId: shift._id,
      date: day,
      attendanceCategory: 'absent',
    });
    await userService.deleteUserById(employee._id, employee._id);

    const historical = await Attendance.findById(record._id).lean();
    expect(historical).not.toBeNull();
    expect(historical.employeeId.toString()).toBe(employee._id.toString());
  });

  test('supports category, timing, employee, and date filters', async () => {
    await attendanceService.createAttendance({ employeeId: employee._id, shiftId: shift._id, date: day, ...times('09:00', '18:00'), timingStatus: 'onTime' });
    const late = await attendanceService.createAttendance({ employeeId: employee._id, shiftId: shift._id, date: '2026-01-16', ...times('09:00', '14:00'), timingStatus: 'arrivedLate' });

    const category = await attendanceService.queryAttendances({ attendanceCategory: 'halfDay' }, {});
    const timing = await attendanceService.queryAttendances({ timingStatus: 'arrivedLate' }, {});
    const employeeResults = await attendanceService.queryAttendances({ employeeId: employee._id.toString() }, {});
    const dateResults = await attendanceService.queryAttendances({ fromDate: day, toDate: day }, {});

    expect(category.results).toHaveLength(1);
    expect(timing.results.map((item) => item.id)).toContain(late._id.toString());
    expect(employeeResults.totalResults).toBe(2);
    expect(dateResults.totalResults).toBe(1);
  });

  test('validates shift threshold format and ordering', () => {
    const invalid = (body) => createShift.body.validate(body).error || updateShift.body.validate(body).error;

    expect(invalid({ minWorkingHours: '8h', halfDayWorkingHours: '9h' })).toBeTruthy();
    expect(invalid({ minWorkingHours: '0h', halfDayWorkingHours: '0h' })).toBeTruthy();
    expect(invalid({ minWorkingHours: '08:00', halfDayWorkingHours: '04:00' })).toBeTruthy();
  });
});
