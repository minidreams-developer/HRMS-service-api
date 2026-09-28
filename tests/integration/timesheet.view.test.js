const mongoose = require('mongoose');
const setupTestDB = require('../utils/setupTestDB');
const { User, Attendance, Holiday, DayOff, LeaveRequests, Overtime, Shift } = require('../../src/models');
const timesheetService = require('../../src/services/timesheet.service');

setupTestDB();
const id = () => new mongoose.Types.ObjectId();

describe('TIMESHEET-01 read aggregation', () => {
  let employee; let staff; let shift;
  beforeEach(async () => {
    [employee, staff] = await User.create([
      { _id: id(), name: 'Timesheet Employee', employeeId: 'EMP-TS-1', email: `ts-e-${Date.now()}@example.com`, role: 'employee' },
      { _id: id(), name: 'Timesheet Staff', employeeId: 'STF-TS-1', email: `ts-s-${Date.now()}@example.com`, role: 'staff' },
    ]);
    shift = await Shift.create({ shiftName: 'Timesheet Shift', shiftCode: 'TS', minWorkingHours: '8h', halfDayWorkingHours: '4h', weekOff: ['Sunday'] });
  });

  test('includes active users without attendance and preserves explicit absent', async () => {
    await Attendance.create({ employeeId: employee._id, date: '2026-02-10', attendanceDay: '2026-02-10', attendanceCategory: 'absent', shiftId: shift._id });
    const result = await timesheetService.getDay({ date: '2026-02-10', role: 'employee', page: 1, limit: 10 });
    expect(result.totalResults).toBe(1);
    expect(result.results[0].effectiveCategory).toBe('absent');
    const noAttendance = await timesheetService.getDay({ date: '2026-02-10', role: 'staff', page: 1, limit: 10 });
    expect(noAttendance.results[0].effectiveCategory).toBe('noAttendance');
  });

  test('applies holiday, day off, leave and approved overtime data', async () => {
    await Holiday.create({ holidayTitle: 'Global Holiday', date: '2026-02-11', status: true, people: [] });
    await DayOff.create({ employeeId: employee._id, date: '2026-02-12', status: true, createdBy: employee._id });
    await LeaveRequests.create({ employeeId: employee._id, leaveType: 'Sick Leave', singleDate: '2026-02-13', status: 'approved', leaveDuration: 'halfDay' });
    await Overtime.create({ employeeId: employee._id, OvertimeDate: '2026-02-13', startTime: '2026-02-13T18:00:00.000Z', endTime: '2026-02-13T20:00:00.000Z', totalDuration: 2, status: 'approved' });
    expect((await timesheetService.getDay({ date: '2026-02-11', role: 'employee', page: 1, limit: 10 })).results[0].effectiveCategory).toBe('holiday');
    expect((await timesheetService.getDay({ date: '2026-02-12', role: 'employee', page: 1, limit: 10 })).results[0].effectiveCategory).toBe('dayOff');
    const leave = (await timesheetService.getDay({ date: '2026-02-13', role: 'employee', page: 1, limit: 10 })).results[0];
    expect(leave.effectiveCategory).toBe('leave');
    expect(leave.overtimeHours).toBe(2);
  });

  test('returns seven week cells and date detail', async () => {
    const week = await timesheetService.getWeek({ startDate: '2026-02-09', role: 'employee', page: 1, limit: 10 });
    expect(week.results[0].days).toHaveLength(7);
    const detail = await timesheetService.getDateDetail(employee._id, '2026-02-09');
    expect(detail.effectiveCategory).toBe('noAttendance');
  });

  test('stats count approved half-day leave and unique employees', async () => {
    await LeaveRequests.create({ employeeId: employee._id, leaveType: 'Casual Leave', singleDate: '2026-02-14', status: 'approved', leaveDuration: 'halfDay' });
    const stats = await timesheetService.getStats('2026-02-14', 'employee');
    expect(stats.onLeave).toBe(1);
  });
});
