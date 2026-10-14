const Joi = require('joi');
const { objectId } = require('./custom.validation');

const getDashboard = {
  query: Joi.object().keys({
    month:          Joi.number().integer().min(1).max(12).optional(),
    year:           Joi.number().integer().min(2000).max(2100).optional(),
    organizationId: Joi.string().custom(objectId).optional(),
    refresh:        Joi.boolean().optional(),
  }),
};

const getQuickStats = {
  query: Joi.object().keys({
    month:          Joi.number().integer().min(1).max(12).optional(),
    year:           Joi.number().integer().min(2000).max(2100).optional(),
    organizationId: Joi.string().custom(objectId).optional(),
  }),
};

const getPayrollOverview = {
  query: Joi.object().keys({
    year:           Joi.number().integer().min(2000).max(2100).optional(),
    organizationId: Joi.string().custom(objectId).optional(),
  }),
};

const getPayrollBreakdown = {
  query: Joi.object().keys({
    month:          Joi.number().integer().min(1).max(12).optional(),
    year:           Joi.number().integer().min(2000).max(2100).optional(),
    organizationId: Joi.string().custom(objectId).optional(),
  }),
};

const getAttendanceOverview = {
  query: Joi.object().keys({
    month: Joi.number().integer().min(1).max(12).optional(),
    year: Joi.number().integer().min(2000).max(2100).optional(),
  }),
};

const generatePaysheet = {
  body: Joi.object().keys({
    month:          Joi.number().integer().min(1).max(12).required(),
    year:           Joi.number().integer().min(2000).max(2100).required(),
    organizationId: Joi.string().custom(objectId).optional(),
  }),
};

const refreshPaysheet = {
  body: Joi.object().keys({
    month:          Joi.number().integer().min(1).max(12).required(),
    year:           Joi.number().integer().min(2000).max(2100).required(),
    organizationId: Joi.string().custom(objectId).optional(),
  }),
};

// ── Payroll list table ────────────────────────────────────────────────────────

const getPayrollList = {
  query: Joi.object().keys({
    month:        Joi.number().integer().min(1).max(12).optional(),
    year:         Joi.number().integer().min(2000).max(2100).optional(),
    search:       Joi.string().allow('').optional(),       // name or employeeId
    status:       Joi.string().valid('draft', 'processed', 'paid', 'stopped', 'resumed').optional(),
    departmentId: Joi.string().custom(objectId).optional(),
    page:         Joi.number().integer().min(1).optional(),
    limit:        Joi.number().integer().min(1).max(100).optional(),
    sortBy:       Joi.string().optional(),                 // e.g. "name:asc"
  }),
};

const getPayrollDetail = {
  params: Joi.object().keys({
    payrollId: Joi.string().custom(objectId).required(),
  }),
};

const updatePayrollStatus = {
  params: Joi.object().keys({
    payrollId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    status: Joi.string().valid('draft', 'processed', 'paid', 'stopped', 'resumed').required(),
  }),
};

module.exports = {
  getDashboard,
  getQuickStats,
  getPayrollOverview,
  getPayrollBreakdown,
  getAttendanceOverview,
  generatePaysheet,
  refreshPaysheet,
  getPayrollList,
  getPayrollDetail,
  updatePayrollStatus,
};
