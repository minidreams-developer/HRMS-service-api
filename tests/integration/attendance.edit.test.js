const mongoose = require('mongoose');
const moment = require('moment');
const request = require('supertest');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { Attendance, Overtime, Shift, User } = require('../../src/models');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');

setupTestDB();

describe('ATTENDANCE-04 edit attendance', () => {
  let employee; let admin; let shift; let alternateShift; let attendance;
  const auth = (user) => `Bearer ${tokenService.generateToken(user._id, moment().add(1, 'day'), tokenTypes.ACCESS)}`;
  const at = (time) => `2026-04-02T${time}:00.000Z`;

  beforeEach(async () => {
    shift = await Shift.create({ shiftName: 'Edit Shift', minWorkingHours: '8h', halfDayWorkingHours: '4h', breakManagement: { enabled: true, duration: 60 } });
    alternateShift = await Shift.create({ shiftName: 'Short Shift', minWorkingHours: '6h', halfDayWorkingHours: '3h', breakManagement: { enabled: true, duration: 30 } });
    [employee, admin] = await User.create([
      { _id: new mongoose.Types.ObjectId(), name: 'Edit Employee', email: `edit-${Date.now()}@example.com`, role: 'employee', workInformation: { shiftId: shift._id } },
      { _id: new mongoose.Types.ObjectId(), name: 'Edit Admin', email: `edit-admin-${Date.now()}@example.com`, role: 'admin' },
    ]);
    attendance = await Attendance.create({ employeeId: employee._id, shiftId: shift._id, date: new Date('2026-04-02'), loginTime: at('09:00'), logoutTime: at('17:00'), attendanceCategory: 'fullDay' });
  });

  test('requires authorization and editReason', async () => {
    await request(app).patch(`/v1/attendance/${attendance._id}`).send({ logoutTime: at('18:00'), editReason: 'Forgot checkout' }).expect(401);
    await request(app).patch(`/v1/attendance/${attendance._id}`).set('Authorization', auth(admin)).send({ logoutTime: at('18:00') }).expect(400);
    await request(app).patch(`/v1/attendance/${attendance._id}`).set('Authorization', auth(employee)).send({ logoutTime: at('18:00'), editReason: 'Not allowed' }).expect(403);
  });

  test('recalculates hours/category, ignores client derived fields, and audits editor', async () => {
    const response = await request(app).patch(`/v1/attendance/${attendance._id}`).set('Authorization', auth(admin)).send({ logoutTime: at('18:00'), totalWorkedHours: 99, overTimeWorkedHours: 99, editReason: 'Forgot checkout' }).expect(200);
    expect(response.body.totalWorkedHours).toBe(8);
    expect(response.body.attendanceCategory).toBe('fullDay');
    expect(response.body.lastEditedBy).toBe(admin._id.toString());
    expect(response.body.lastEditedAt).toBeTruthy();
    expect(response.body.editReason).toBe('Forgot checkout');
    expect(response.body.overTimeWorkedHours).toBe(0);
  });

  test('applies changed shift break and thresholds', async () => {
    const response = await request(app).patch(`/v1/attendance/${attendance._id}`).set('Authorization', auth(admin)).send({ shiftId: alternateShift._id.toString(), logoutTime: at('15:00'), editReason: 'Incorrect shift' }).expect(200);
    expect(response.body.totalWorkedHours).toBe(5.5);
    expect(response.body.attendanceCategory).toBe('halfDay');
  });

  test('supports explicit absent and recorded manual category override', async () => {
    const absent = await request(app).patch(`/v1/attendance/${attendance._id}`).set('Authorization', auth(admin)).send({ loginTime: null, logoutTime: null, attendanceCategory: 'absent', editReason: 'Biometric issue' }).expect(200);
    expect(absent.body).toMatchObject({ attendanceCategory: 'absent', totalWorkedHours: 0, isManualOverride: true });
    const override = await request(app).patch(`/v1/attendance/${attendance._id}`).set('Authorization', auth(admin)).send({ loginTime: at('09:00'), logoutTime: at('10:00'), attendanceCategory: 'fullDay', editReason: 'Approved manual correction' }).expect(200);
    expect(override.body).toMatchObject({ attendanceCategory: 'fullDay', isManualOverride: true, overrideReason: 'Approved manual correction' });
  });

  test('rejects invalid time order and leaves approved OT untouched', async () => {
    await Overtime.create({ employeeId: employee._id, OvertimeDate: new Date('2026-04-02'), totalDuration: 2, status: 'approved' });
    await request(app).patch(`/v1/attendance/${attendance._id}`).set('Authorization', auth(admin)).send({ loginTime: at('18:00'), logoutTime: at('09:00'), editReason: 'Invalid correction' }).expect(400);
    expect(await Overtime.countDocuments({ employeeId: employee._id, status: 'approved' })).toBe(1);
  });
});
