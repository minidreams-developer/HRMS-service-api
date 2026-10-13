const mongoose = require('mongoose');
const request = require('supertest');
const moment = require('moment');
const httpStatus = require('http-status');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User, Department, Payroll, PayrollPeriod, ContractorSettlement, Commission } = require('../../src/models');
const tokenService = require('../../src/services/token.service');
const { tokenTypes } = require('../../src/config/tokens');

setupTestDB();
const id = () => new mongoose.Types.ObjectId();
const token = (user) => tokenService.generateToken(user._id, moment().add(30, 'minutes'), tokenTypes.ACCESS);
const makeUser = (role, suffix, workInformation = {}) => ({
  _id: id(), name: `${role}-${suffix}`, employeeId: `${role}-${suffix}`, email: `${role}-${suffix}-${Date.now()}@example.com`,
  role, isActive: 'Active', isDeleted: false, workInformation,
});

describe('PAYHUB-ABSTRACT-02 focused behavior', () => {
  let admin; let employee; let staff; let contractor; let agent; let milling; let sales;
  beforeEach(async () => {
    [admin, employee, staff, contractor, agent] = await User.create([
      makeUser('admin', 'abstract'),
      makeUser('employee', 'abstract', { designation: 'Developer' }),
      makeUser('staff', 'abstract', { designation: 'Accountant' }),
      makeUser('contractor', 'abstract'),
      { ...makeUser('agent', 'abstract'), agentId: 'AGT-ABSTRACT' },
    ]);
    [milling, sales] = await Department.create([
      { departmentName: 'Milling', departmentCode: 'D-MILL' },
      { departmentName: 'Sales', departmentCode: 'D-SALES' },
    ]);
    await User.updateOne({ _id: employee._id }, { 'workInformation.department': milling._id });
    await User.updateOne({ _id: staff._id }, { 'workInformation.department': sales._id });
    await Commission.create({ _id: id(), commission: 10, allowance: 500, salaryDisbursementType: 'monthly' }).then((commission) => User.updateOne({ _id: agent._id }, { commissionDetails: commission._id }));
  });

  test('designation, department, search and legacy string filters work', async () => {
    const employeeResult = await request(app).get('/v1/payroll?role=employee&month=10&year=2026&designation=Developer&departmentId=' + milling._id + '&search=employee-abstract').set({ Authorization: `Bearer ${token(admin)}` }).expect(httpStatus.OK);
    expect(employeeResult.body.results).toHaveLength(1);
    const staffResult = await request(app).get('/v1/payroll?role=staff&month=10&year=2026&designation=Accountant').set({ Authorization: `Bearer ${token(admin)}` }).expect(httpStatus.OK);
    expect(staffResult.body.results).toHaveLength(1);
    const noMatch = await request(app).get('/v1/payroll?role=employee&month=10&year=2026&designation=Missing').set({ Authorization: `Bearer ${token(admin)}` }).expect(httpStatus.OK);
    expect(noMatch.body.results).toHaveLength(0);
  });

  test('summary groups finalized snapshots by department without double counting', async () => {
    await Payroll.create([
      { employeeId: employee._id, month: 10, year: 2026, status: 'processed', snapshot: { employee: { id: employee._id, role: 'employee', department: milling._id.toString() }, overtimeAmount: 100, overtimeHours: 2, grossEarnings: 2100, takeHome: 1900 } },
      { employeeId: staff._id, month: 10, year: 2026, status: 'processed', snapshot: { employee: { id: staff._id, role: 'staff', department: sales.departmentName }, overtimeAmount: 50, overtimeHours: 1, grossEarnings: 1050, takeHome: 950 } },
    ]);
    await PayrollPeriod.create({ month: 10, year: 2026, status: 'finalized', totalPayout: 2850, payrollCount: 2, finalizedAt: new Date(), finalizedBy: admin._id });
    await User.updateOne({ _id: employee._id }, { 'workInformation.department': sales._id });
    const response = await request(app).get('/v1/payroll/abstract/summary?month=10&year=2026').set({ Authorization: `Bearer ${token(admin)}` }).expect(httpStatus.OK);
    expect(response.body.departmentLedger).toHaveLength(2);
    expect(response.body.departmentLedger.find((row) => String(row.departmentName) === String(milling._id))?.netPayable).toBe(1900);
    expect(response.body.departmentLedger.find((row) => row.departmentName === 'Sales')?.netPayable).toBe(950);
    expect(response.body).toEqual(expect.objectContaining({ employeeTypeMaster: expect.any(Object), agentLedger: expect.any(Array), payrollSummary: expect.any(Object) }));
  });

  test('agent payout and total shifts remain unavailable', async () => {
    const response = await request(app).get('/v1/payroll?role=agent&month=10&year=2026').set({ Authorization: `Bearer ${token(admin)}` }).expect(httpStatus.OK);
    expect(response.body.results[0]).toMatchObject({ payoutAvailable: false, totalShifts: null, payableSalary: null, cashDisbursement: null, bankDisbursement: null, commission: 10, allowance: 500 });
  });

  test.each(['employee', 'staff', 'contractor', 'agent', 'summary'])('exports %s as CSV and protects access', async (type) => {
    if (type === 'contractor') await ContractorSettlement.create({ contractorId: contractor._id, month: 10, year: 2026, totalShare: 500, status: 'processed' });
    const response = await request(app).get(`/v1/payroll/abstract/export?month=10&year=2026&type=${type}`).set({ Authorization: `Bearer ${token(admin)}` }).expect(httpStatus.OK);
    expect(response.headers['content-type']).toMatch(/text\/csv/);
    expect(response.text).toContain(type === 'agent' ? 'AGT-ABSTRACT' : type === 'summary' ? 'departmentLedger' : type === 'contractor' ? 'contractor-abstract' : `${type}-abstract`);
    await request(app).get(`/v1/payroll/abstract/export?month=10&year=2026&type=${type}`).set({ Authorization: `Bearer ${token(employee)}` }).expect(httpStatus.FORBIDDEN);
  });
});
