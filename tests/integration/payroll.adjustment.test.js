const mongoose = require('mongoose');
const request = require('supertest');
const moment = require('moment');
const httpStatus = require('http-status');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User, Payroll, Adjustment, PayrollPeriod } = require('../../src/models');
const adjustmentService = require('../../src/services/adjustment.service');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');

setupTestDB();

const id = () => new mongoose.Types.ObjectId();
const makeUser = (role, suffix) => ({ _id: id(), name: `${role}-${suffix}`, employeeId: `${role}-${suffix}`, email: `${role}-${suffix}-${Date.now()}@example.com`, role });
const auth = (user) => ({ Authorization: `Bearer ${tokenService.generateToken(user._id, moment().add(30, 'minutes'), tokenTypes.ACCESS)}` });

describe('PAYHUB-ADJUSTMENT-01 additions and deductions', () => {
  let admin;
  let employee;
  let payroll;

  beforeEach(async () => {
    [admin, employee] = await User.create([makeUser('admin', 'adjustment'), makeUser('employee', 'adjustment')]);
    payroll = await Payroll.create({ employeeId: employee._id, month: 10, year: 2026, status: 'draft' });
  });

  const create = (overrides = {}) => adjustmentService.createAdjustment({
    forWhom: 'individual', employeeId: employee._id.toString(), type: 'addition', component: 'bonus',
    date: '2026-10-14', payrollMonth: 10, payrollYear: 2026, amount: 500, remarks: 'test', ...overrides,
  }, admin._id);

  test('creates additions and deductions with pending status and audit data', async () => {
    const addition = await create();
    const deduction = await create({ type: 'deduction', component: 'penalty', amount: 125 });
    expect(String(addition.employeeId._id || addition.employeeId)).toBe(String(employee._id));
    expect(addition.type).toBe('addition');
    expect(addition.status).toBe('pending');
    expect(addition.createdBy._id || addition.createdBy).toBeTruthy();
    expect(addition.date).toBeTruthy();
    expect(deduction.type).toBe('deduction');
    expect(deduction.component).toBe('penalty');
  });

  test('rejects invalid amount, type, and component at the API boundary', async () => {
    const headers = auth(admin);
    const base = { forWhom: 'individual', employeeId: employee._id, date: '2026-10-14', payrollMonth: 10, payrollYear: 2026, amount: 1 };
    await request(app).post('/v1/payroll/adjustments').set(headers).send({ ...base, type: 'addition', component: 'bonus', amount: 0 }).expect(httpStatus.BAD_REQUEST);
    await request(app).post('/v1/payroll/adjustments').set(headers).send({ ...base, type: 'invalid', component: 'bonus' }).expect(httpStatus.BAD_REQUEST);
    await request(app).post('/v1/payroll/adjustments').set(headers).send({ ...base, type: 'addition', component: 'unsupported' }).expect(httpStatus.BAD_REQUEST);
  });

  test('approval then explicit application maps additions exactly once', async () => {
    const adjustment = await create({ component: 'incentive', amount: 700 });
    await adjustmentService.updateAdjustmentStatus(adjustment._id, 'approved', admin._id);
    let current = await Payroll.findById(payroll._id).lean();
    expect(current.extras).toBe(0);
    await adjustmentService.updateAdjustmentStatus(adjustment._id, 'applied', admin._id);
    current = await Payroll.findById(payroll._id).lean();
    expect(current.extras).toBe(700);
    const applied = await Adjustment.findById(adjustment._id).lean();
    expect(applied.status).toBe('applied');
    expect(String(applied.payrollId)).toBe(String(payroll._id));
    await expect(adjustmentService.updateAdjustmentStatus(adjustment._id, 'applied', admin._id)).rejects.toThrow('Only approved adjustments can be applied');
    expect((await Payroll.findById(payroll._id).lean()).extras).toBe(700);
  });

  test.each([
    ['addition', 'bonus', 'extras'], ['addition', 'incentive', 'extras'], ['addition', 'other', 'otherWages'],
    ['deduction', 'advance', 'loanAndAdvance'], ['deduction', 'emi', 'loanAndAdvance'], ['deduction', 'penalty', 'penalties'], ['deduction', 'other', 'otherDeductions'],
  ])('maps %s %s to Payroll.%s', async (type, component, field) => {
    const adjustment = await create({ type, component, amount: 33 });
    await adjustmentService.updateAdjustmentStatus(adjustment._id, 'approved', admin._id);
    await adjustmentService.updateAdjustmentStatus(adjustment._id, 'applied', admin._id);
    expect((await Payroll.findById(payroll._id).lean())[field]).toBe(33);
  });

  test('cancellation is audited and applied records cannot be cancelled or edited', async () => {
    const adjustment = await create();
    await adjustmentService.updateAdjustmentStatus(adjustment._id, 'canceled', admin._id);
    const cancelled = await Adjustment.findById(adjustment._id).lean();
    expect(cancelled.cancelledAt).toBeTruthy();
    const applied = await create({ amount: 50 });
    await adjustmentService.updateAdjustmentStatus(applied._id, 'approved', admin._id);
    await adjustmentService.updateAdjustmentStatus(applied._id, 'applied', admin._id);
    await expect(adjustmentService.updateAdjustmentById(applied._id, { amount: 100 })).rejects.toThrow('Cannot edit adjustment');
    await expect(adjustmentService.updateAdjustmentStatus(applied._id, 'canceled', admin._id)).rejects.toThrow('Cannot change adjustment');
  });

  test('quick stats and pending list use exact period totals', async () => {
    await create({ amount: 100 });
    await create({ type: 'deduction', component: 'penalty', amount: 40 });
    const stats = await adjustmentService.getQuickStats(10, 2026);
    expect(stats).toEqual({ totalAdditionsAmount: 100, totalDeductionsAmount: 40, pendingApprovals: 2, appliedToPayroll: 0 });
    const pending = await adjustmentService.queryAdjustments({ month: 10, year: 2026, status: 'pending' }, { page: 1, limit: 10 });
    expect(pending.totalResults).toBe(2);
  });

  test('finalized payroll periods block creation, editing, and application', async () => {
    await PayrollPeriod.create({ month: 10, year: 2026, status: 'finalized', totalPayout: 0, payrollCount: 1, finalizedAt: new Date(), finalizedBy: admin._id });
    await expect(create()).rejects.toThrow('finalized payroll period');
    const existing = await Adjustment.create({ forWhom: 'individual', employeeId: employee._id, type: 'addition', component: 'bonus', date: new Date(), payrollMonth: 10, payrollYear: 2026, amount: 10, status: 'pending', createdBy: admin._id });
    await expect(adjustmentService.updateAdjustmentById(existing._id, { amount: 20 })).rejects.toThrow('finalized payroll period');
    existing.status = 'approved';
    await existing.save();
    await expect(adjustmentService.updateAdjustmentStatus(existing._id, 'applied', admin._id)).rejects.toThrow('finalized payroll period');
    expect((await Payroll.findById(payroll._id).lean()).extras).toBe(0);
  });

  test('management is allowed and employee is denied organization-wide access', async () => {
    const headers = auth(admin);
    await request(app).get('/v1/payroll/adjustments?month=10&year=2026').set(headers).expect(httpStatus.OK);
    await request(app).get('/v1/payroll/adjustments/quick-stats?month=10&year=2026').set(headers).expect(httpStatus.OK);
    await request(app).get('/v1/payroll/adjustments').set(auth(employee)).expect(httpStatus.FORBIDDEN);
    await request(app).post('/v1/payroll/adjustments').set(auth(employee)).send({ forWhom: 'individual', employeeId: employee._id, type: 'addition', component: 'bonus', date: '2026-10-14', payrollMonth: 10, payrollYear: 2026, amount: 5 }).expect(httpStatus.FORBIDDEN);
  });
});
