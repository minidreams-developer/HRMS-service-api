const Joi = require('joi');
const { objectId } = require('./custom.validation');

const getPayrollList = {
  query: Joi.object().keys({
    role:         Joi.string().valid('employee', 'staff', 'contractor', 'agent').optional(),
    month:        Joi.number().integer().min(1).max(12).optional(),
    year:         Joi.number().integer().min(2000).max(2100).optional(),
    // search across employee name, employeeId, email
    search:       Joi.string().allow('').optional(),
    // work info filters
    departmentId: Joi.string().custom(objectId).optional(),
    shiftId:      Joi.string().custom(objectId).optional(),
    branchId:     Joi.string().custom(objectId).optional(),
    designation:  Joi.string().allow('').optional(),
    // payroll status filter
    status:       Joi.string().valid('draft', 'processed', 'paid', 'stopped', 'resumed').optional(),
    // pagination & sorting
    sortBy:       Joi.string().optional(),
    limit:        Joi.number().integer().min(1).max(100).optional(),
    page:         Joi.number().integer().min(1).optional(),
  }),
};

const getPayrollPeriods = {
  query: Joi.object().keys({
    year: Joi.number().integer().min(2000).max(2100).optional(),
  }),
};

const getPayrollAbstractSummary = {
  query: Joi.object().keys({
    month: Joi.number().integer().min(1).max(12).required(),
    year: Joi.number().integer().min(2000).max(2100).required(),
  }),
};

const getPayrollAbstractExport = {
  query: Joi.object().keys({
    month: Joi.number().integer().min(1).max(12).required(),
    year: Joi.number().integer().min(2000).max(2100).required(),
    type: Joi.string().valid('employee', 'staff', 'contractor', 'agent', 'summary').required(),
    search: Joi.string().allow('').optional(),
    designation: Joi.string().allow('').optional(),
    departmentId: Joi.string().custom(objectId).optional(),
  }),
};

const finalizePayrollPeriod = {
  params: Joi.object().keys({
    year: Joi.number().integer().min(2000).max(2100).required(),
    month: Joi.number().integer().min(1).max(12).required(),
  }),
};

const getFinalizedPayrollPeriods = {
  query: Joi.object().keys({
    year: Joi.number().integer().min(2000).max(2100).optional(),
    search: Joi.string().allow('').optional(),
  }),
};

const getPayrollAbstract = {
  params: Joi.object().keys({
    year: Joi.number().integer().min(2000).max(2100).required(),
    month: Joi.number().integer().min(1).max(12).required(),
  }),
};

const getPayslipOptions = {
  query: Joi.object().keys({
    year: Joi.number().integer().min(2000).max(2100).required(),
    month: Joi.number().integer().min(1).max(12).required(),
    category: Joi.string().valid('all', 'employee', 'staff').default('all'),
    search: Joi.string().allow('').optional(),
  }),
};

const getEmployeePayroll = {
  params: Joi.object().keys({
    employeeId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    month: Joi.number().integer().min(1).max(12).optional(),
    year: Joi.number().integer().min(2000).max(2100).optional(),
  }),
};

const getMyPayroll = {
  query: Joi.object().keys({
    month: Joi.number().integer().min(1).max(12).optional(),
    year: Joi.number().integer().min(2000).max(2100).optional(),
    status: Joi.string().valid('draft', 'processed', 'paid', 'stopped', 'resumed').optional(),
    sortBy: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    page: Joi.number().integer().min(1).optional(),
  }),
};

const getMyPayrollById = { params: Joi.object().keys({ payrollId: Joi.string().custom(objectId).required() }) };
const getPayslip = { params: Joi.object().keys({ payrollId: Joi.string().custom(objectId).required() }) };

const createPayroll = {
  body: Joi.object().keys({
    employeeId: Joi.string().custom(objectId).required(),
    month: Joi.number().integer().min(1).max(12).required(),
    year: Joi.number().integer().min(2000).max(2100).required(),
    extras: Joi.number().min(0).optional(),
    penalties: Joi.number().min(0).optional(),
    loanAndAdvance: Joi.number().min(0).optional(),
    otherDeductions: Joi.number().min(0).optional(),
    otherWages: Joi.number().min(0).optional(),
    totalSalary: Joi.number().min(0).optional(),
    overtimePayment: Joi.number().min(0).optional(),
    additionPayment: Joi.number().min(0).optional(),
    deductions: Joi.number().min(0).optional(),
    totalPayableAmount: Joi.number().min(0).optional(),
    pfAmount: Joi.number().min(0).optional(),
    esiAmount: Joi.number().min(0).optional(),
    status: Joi.string().valid('draft', 'processed', 'paid', 'stopped', 'resumed').optional(),
    remarks: Joi.string().allow('').optional(),
  }),
};

const upsertPayroll = {
  params: Joi.object().keys({
    employeeId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    month: Joi.number().integer().min(1).max(12).required(),
    year: Joi.number().integer().min(2000).max(2100).required(),
    extras: Joi.number().min(0).optional(),
    penalties: Joi.number().min(0).optional(),
    loanAndAdvance: Joi.number().min(0).optional(),
    otherDeductions: Joi.number().min(0).optional(),
    otherWages: Joi.number().min(0).optional(),
    totalSalary: Joi.number().min(0).optional(),
    overtimePayment: Joi.number().min(0).optional(),
    additionPayment: Joi.number().min(0).optional(),
    deductions: Joi.number().min(0).optional(),
    totalPayableAmount: Joi.number().min(0).optional(),
    pfAmount: Joi.number().min(0).optional(),
    esiAmount: Joi.number().min(0).optional(),
    status: Joi.string().valid('draft', 'processed', 'paid', 'stopped', 'resumed').optional(),
    remarks: Joi.string().allow('').optional(),
  }),
};

const processPayroll = {
  params: Joi.object().keys({
    employeeId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    month: Joi.number().integer().min(1).max(12).required(),
    year: Joi.number().integer().min(2000).max(2100).required(),
  }),
};

const deletePayroll = {
  params: Joi.object().keys({
    payrollId: Joi.string().custom(objectId).required(),
  }),
};

const stopPayroll = {
  params: Joi.object().keys({
    employeeId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    month: Joi.number().integer().min(1).max(12).required(),
    year: Joi.number().integer().min(2000).max(2100).required(),
    stopType: Joi.string().required(),
    reason: Joi.string().required(),
    effectiveFrom: Joi.date().required(),
    resumeOn: Joi.date().optional(),
    impactMonth: Joi.string().required(),
    stopRemarks: Joi.string().allow('').optional(),
  }),
};

const resumePayroll = {
  params: Joi.object().keys({
    employeeId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    month: Joi.number().integer().min(1).max(12).required(),
    year: Joi.number().integer().min(2000).max(2100).required(),
    resumeRemarks: Joi.string().allow('').optional(),
  }),
};

const getStoppedPayrolls = {
  query: Joi.object().keys({
    month: Joi.number().integer().min(1).max(12).optional(),
    year: Joi.number().integer().min(2000).max(2100).optional(),
    stopType: Joi.string().optional(),
    reason: Joi.string().optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
  }),
};

module.exports = {
  getPayrollList,
  getPayrollPeriods,
  getPayrollAbstractSummary,
  getPayrollAbstractExport,
  finalizePayrollPeriod,
  getFinalizedPayrollPeriods,
  getPayrollAbstract,
  getPayslipOptions,
  getEmployeePayroll,
  getMyPayroll,
  getMyPayrollById,
  getPayslip,
  createPayroll,
  upsertPayroll,
  processPayroll,
  deletePayroll,
  stopPayroll,
  resumePayroll,
  getStoppedPayrolls,
};
