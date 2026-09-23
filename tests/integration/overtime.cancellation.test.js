const mongoose = require('mongoose');
const request = require('supertest');
const moment = require('moment');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');
const { User, Overtime } = require('../../src/models');
const payroll = require('../../src/services/payroll.service');
const attendance = require('../../src/services/attendance.service');
setupTestDB();
const id = () => new mongoose.Types.ObjectId();
const token = (u) => tokenService.generateToken(u._id, moment().add(1, 'day'), tokenTypes.ACCESS);
const auth = (u) => ({ Authorization: `Bearer ${token(u)}` });
const body = (employeeId, from = '18:00', to = '20:00') => ({ employeeId, OvertimeDate: '2026-06-01T00:00:00.000Z', startTime: `2026-06-01T${from}:00.000Z`, endTime: `2026-06-01T${to}:00.000Z`, reason: 'Approved support' });

describe('OVERTIME-03 approved cancellation', () => {
  let employee; let admin;
  beforeEach(async () => {
    employee = await User.create({ _id: id(), name: 'OT Cancel Employee', email: `otc-${Date.now()}@example.com`, role: 'employee' });
    admin = await User.create({ _id: id(), name: 'OT Cancel Admin', email: `otca-${Date.now()}@example.com`, role: 'admin' });
  });
  const create = async (u, b = body(employee._id)) => (await request(app).post('/v1/overtime').set(auth(u)).send(b).expect(201)).body;
  const status = (u, idValue, b) => request(app).patch(`/v1/overtime/${idValue}/status`).set(auth(u)).send(b);

  test('management cancels approved OT with audit history and employee cannot', async () => {
    const p = await create(employee); await status(admin, p.id, { status: 'approved' }).expect(200);
    await status(employee, p.id, { status: 'cancelled', cancellationReason: 'Correction' }).expect(403);
    const result = await status(admin, p.id, { status: 'cancelled', cancellationReason: 'Correction' }).expect(200);
    expect(result.body).toMatchObject({ status: 'cancelled', cancelledBy: String(admin._id), cancellationReason: 'Correction' });
    expect(result.body.cancelledAt).toBeTruthy();
    expect(result.body.statusHistory.map((entry) => entry.status)).toEqual(['pending', 'approved', 'cancelled']);
  });
  test('reason is required and cancellation is terminal', async () => {
    const p = await create(employee); await status(admin, p.id, { status: 'approved' }).expect(200);
    await status(admin, p.id, { status: 'cancelled' }).expect(400);
    await status(admin, p.id, { status: 'cancelled', cancellationReason: 'Removed' }).expect(200);
    await status(admin, p.id, { status: 'approved' }).expect(400);
    await status(admin, p.id, { status: 'cancelled', cancellationReason: 'Again' }).expect(400);
    await request(app).patch(`/v1/overtime/${p.id}`).set(auth(admin)).send({ reason: 'edit' }).expect(400);
  });
  test('cancelled OT disappears from payroll, summary, calendar, and overlap diagnostics re-evaluate', async () => {
    const a = await create(employee); await status(admin, a.id, { status: 'approved' });
    const b = await Overtime.create({ ...body(employee._id, '19:00', '21:00'), status: 'approved', totalDuration: 2, approvedBy: admin._id, approvedAt: new Date() });
    let summary = await attendance.getEmployeeAttendanceSummary(employee._id, '2026-06-01', '2026-06-01');
    expect(summary.overlappingOvertimeDates).toContain('2026-06-01');
    await status(admin, a.id, { status: 'cancelled', cancellationReason: 'Correction' });
    summary = await attendance.getEmployeeAttendanceSummary(employee._id, '2026-06-01', '2026-06-01');
    expect(summary.overtimeHours).toBe(2); expect(summary.overlappingOvertimeDates).toEqual([]);
    expect((await attendance.getEmployeeCalendar(employee._id, '2026-06-01', '2026-06-01'))[0].approvedOvertime.hours).toBe(2);
    const result = await payroll.computePayrollForEmployee(employee, 6, 2026);
    expect(result.overlappingOvertimeRecords).toEqual([]);
  });
  test('soft-deleted employee approved OT can be cancelled by management', async () => {
    const p = await create(employee); await status(admin, p.id, { status: 'approved' }); await User.updateOne({ _id: employee._id }, { isDeleted: true, deletedAt: new Date() });
    await status(admin, p.id, { status: 'cancelled', cancellationReason: 'Historical correction' }).expect(200);
    expect((await Overtime.findById(p.id)).status).toBe('cancelled');
  });
});
