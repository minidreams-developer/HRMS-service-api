const mongoose = require('mongoose');
const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User, LeaveRequests, LeaveBalance, Shift, Holiday } = require('../../src/models');
const leaveService = require('../../src/services/leaveRequests.service');

setupTestDB();

const id = () => new mongoose.Types.ObjectId();

describe('LEAVE-01 foundation', () => {
  let employee;
  let admin;

  beforeEach(async () => {
    employee = await User.create({ _id: id(), name: 'Leave Employee', email: `leave-${Date.now()}-${Math.random()}@example.com`, role: 'employee' });
    admin = await User.create({ _id: id(), name: 'Leave Admin', email: `admin-${Date.now()}-${Math.random()}@example.com`, role: 'admin' });
  });

  const single = (overrides = {}) => ({
    employeeId: employee._id,
    leaveType: 'Casual Leave',
    singleDate: '2026-03-02',
    leaveDuration: 'fullDay',
    ...overrides,
  });

  test('requires authentication on leave routes', async () => {
    await request(app).get('/v1/leave-requests').expect(httpStatus.UNAUTHORIZED);
  });

  test('validates single date, range shape, and half-day shape', async () => {
    const created = await leaveService.createLeaveRequests(single({ leaveDuration: 'halfDay', halfDaySession: 'firstHalf' }));
    expect(created.status).toBe('pending');
    expect(created.singleDate.toISOString()).toContain('2026-03-02');

    await expect(leaveService.createLeaveRequests(single({ startDate: '2026-03-02', endDate: '2026-03-03' }))).rejects.toThrow('either singleDate');
    await expect(leaveService.createLeaveRequests(single({ singleDate: null, startDate: '2026-03-02' }))).rejects.toThrow('either singleDate');
    await expect(leaveService.createLeaveRequests(single({ leaveDuration: 'halfDay', halfDaySession: 'firstHalf', startDate: '2026-03-02', endDate: '2026-03-03', singleDate: null }))).rejects.toThrow('singleDate');
  });

  test('blocks pending and approved overlap but allows rejected and cancelled overlap', async () => {
    const pending = await leaveService.createLeaveRequests(single());
    await expect(leaveService.createLeaveRequests(single())).rejects.toThrow('overlaps');
    pending.status = 'rejected';
    await pending.save();
    await leaveService.createLeaveRequests(single());
    await expect(leaveService.createLeaveRequests(single())).rejects.toThrow('overlaps');
  });

  test('allows first and second half separately but blocks duplicate half', async () => {
    await leaveService.createLeaveRequests(single({ leaveDuration: 'halfDay', halfDaySession: 'firstHalf' }));
    await expect(leaveService.createLeaveRequests(single({ leaveDuration: 'halfDay', halfDaySession: 'firstHalf' }))).rejects.toThrow('overlaps');
    const second = await leaveService.createLeaveRequests(single({ leaveDuration: 'halfDay', halfDaySession: 'secondHalf' }));
    expect(second.status).toBe('pending');
  });

  test('excludes holidays and week-offs from leave days', async () => {
    const shift = await Shift.create({ shiftName: 'Leave Shift', weekOff: ['Sunday'] });
    employee.workInformation.shiftId = shift._id;
    await employee.save();
    await Holiday.create({ holidayTitle: 'Holiday', date: '2026-03-02', status: true, people: [employee._id] });
    const leave = await leaveService.createLeaveRequests(single({ startDate: '2026-03-01', endDate: '2026-03-03', singleDate: null }));
    expect(leave.leaveDays).toBe(1);
  });

  test('pending does not consume balance; approval consumes once', async () => {
    await LeaveBalance.create({ employeeId: employee._id, leaveType: 'Casual Leave', year: 2026, allocated: 2 });
    const leave = await leaveService.createLeaveRequests(single());
    expect((await LeaveBalance.findOne({ employeeId: employee._id })).used).toBe(0);
    await leaveService.updateLeaveStatus(leave._id, 'approved', admin._id);
    expect((await LeaveBalance.findOne({ employeeId: employee._id })).used).toBe(1);
    await expect(leaveService.updateLeaveStatus(leave._id, 'approved', admin._id)).rejects.toThrow('Cannot change');
  });

  test('rejects insufficient paid balance and permits unpaid leave without balance', async () => {
    const paid = await leaveService.createLeaveRequests(single());
    await expect(leaveService.updateLeaveStatus(paid._id, 'approved', admin._id)).rejects.toThrow('balance');

    const unpaid = await leaveService.createLeaveRequests(single({ leaveType: 'Unpaid Leave', singleDate: '2026-03-03' }));
    const approved = await leaveService.updateLeaveStatus(unpaid._id, 'approved', admin._id);
    expect(approved.status).toBe('approved');
  });

  test('stores approval and rejection metadata', async () => {
    const rejected = await leaveService.createLeaveRequests(single());
    const result = await leaveService.updateLeaveStatus(rejected._id, 'rejected', admin._id, 'Staffing constraint');
    expect(result).toMatchObject({ status: 'rejected', rejectedBy: admin._id, rejectionReason: 'Staffing constraint' });
    expect(Array.from(result.statusHistory, (entry) => entry.status)).toEqual(['pending', 'rejected']);
  });
});
