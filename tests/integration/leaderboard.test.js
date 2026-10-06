const request = require('supertest');
const httpStatus = require('http-status');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User, Attendance, Overtime } = require('../../src/models');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');
const { calculateAttendanceLeaderboardPoints } = require('../../src/services/leaderboard.service');

setupTestDB();

const auth = (user) => ({ Authorization: `Bearer ${tokenService.generateToken(user._id, moment().add(1, 'day'), tokenTypes.ACCESS)}` });

describe('LEADERBOARD-01 attendance leaderboard', () => {
  test('calculates locked daily scores', () => {
    expect(calculateAttendanceLeaderboardPoints({ attendanceCategory: 'fullDay', timingStatus: 'onTime' })).toBe(25);
    expect(calculateAttendanceLeaderboardPoints({ attendanceCategory: 'fullDay', timingStatus: 'arrivedLate' })).toBe(15);
    expect(calculateAttendanceLeaderboardPoints({ attendanceCategory: 'halfDay', timingStatus: 'onTime' })).toBe(15);
    expect(calculateAttendanceLeaderboardPoints({ attendanceCategory: 'absent', timingStatus: 'onTime', approvedOvertime: true })).toBe(0);
    expect(calculateAttendanceLeaderboardPoints({ attendanceCategory: 'fullDay', timingStatus: 'onTime', approvedOvertime: true })).toBe(30);
  });

  test('requires management access and returns employee/staff ranking', async () => {
    const admin = await User.create({ name: 'Admin', email: 'leader-admin@example.com', password: 'password1', role: 'admin' });
    const employee = await User.create({ name: 'Leader Employee', email: 'leader-employee@example.com', password: 'password1', role: 'employee', employeeId: 'EMP-LB-1', isActive: 'Active' });
    const date = '2026-10-05';
    await Attendance.create({ employeeId: employee._id, date, attendanceDay: date, attendanceCategory: 'fullDay', timingStatus: 'onTime', loginTime: `${date}T09:00:00.000Z`, logoutTime: `${date}T18:00:00.000Z` });
    await Overtime.create({ employeeId: employee._id, requestedDate: date, OvertimeDate: date, startTime: `${date}T18:00:00.000Z`, endTime: `${date}T19:00:00.000Z`, totalDuration: 1, status: 'approved' });
    await request(app).get('/v1/leaderboard?date=2026-10-05').expect(httpStatus.UNAUTHORIZED);
    const response = await request(app).get('/v1/leaderboard?date=2026-10-05&limit=10').set(auth(admin)).expect(httpStatus.OK);
    expect(response.body.results).toHaveLength(1);
    expect(response.body.results[0]).toMatchObject({ name: 'Leader Employee', todayPoints: 30, weekTotalPoints: 30, currentStreak: 1 });
    expect(response.body.results[0].badgeDetails).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'zeroAbsenceChamp', earned: true }),
      expect.objectContaining({ key: 'neverLate', earned: true }),
      expect.objectContaining({ key: 'perfectMonth', earned: false }),
    ]));
  });
});
