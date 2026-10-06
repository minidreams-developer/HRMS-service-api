const request = require('supertest');
const httpStatus = require('http-status');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User, Attendance } = require('../../src/models');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');

setupTestDB();

const auth = (user) => ({ Authorization: `Bearer ${tokenService.generateToken(user._id, moment().add(1, 'day'), tokenTypes.ACCESS)}` });

describe('TIMESHEET quick stats', () => {
  test('returns filtered attendance cards for the requested period', async () => {
    const admin = await User.create({ name: 'Stats Admin', email: 'stats-admin@example.com', password: 'password1', role: 'admin' });
    const employee = await User.create({ name: 'Stats Employee', email: 'stats-employee@example.com', password: 'password1', role: 'employee', isActive: 'Active' });
    const staff = await User.create({ name: 'Stats Staff', email: 'stats-staff@example.com', password: 'password1', role: 'staff', isActive: 'Active' });
    await Attendance.create({ employeeId: employee._id, date: '2026-10-06', attendanceDay: '2026-10-06', attendanceCategory: 'fullDay', timingStatus: 'onTime' });
    await Attendance.create({ employeeId: staff._id, date: '2026-10-06', attendanceDay: '2026-10-06', attendanceCategory: 'absent' });

    await request(app).get('/v1/timesheet/quick-stats?role=employee&period=today&toDate=2026-10-06').expect(httpStatus.UNAUTHORIZED);
    const response = await request(app).get('/v1/timesheet/quick-stats?role=employee&period=today&toDate=2026-10-06').set(auth(admin)).expect(httpStatus.OK);
    expect(response.body).toMatchObject({ period: 'today', fromDate: '2026-10-06', toDate: '2026-10-06', present: 1, absent: 0, onTime: 1, lateEntry: 0, onLeave: 0 });
  });
});
