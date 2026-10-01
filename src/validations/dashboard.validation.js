const Joi = require('joi');

// Shared global filter keys applied to every dashboard endpoint
const globalFilters = {
  branchId:     Joi.string().optional(),
  departmentId: Joi.string().optional(),
  teamId:       Joi.string().optional(),
};

const getDashboard = {
  query: Joi.object().keys({
    date: Joi.date().iso().optional(),
    period: Joi.string().valid('today', 'week', 'month').default('today'),
    ...globalFilters,
  }),
};

const getQuickStats = {
  query: Joi.object().keys({
    date: Joi.date().iso().optional(),
    ...globalFilters,
  }),
};

const getAttendanceOverview = {
  query: Joi.object().keys({
    date: Joi.date().iso().optional(),
    period: Joi.string().valid('today', 'week', 'month').default('week'),
    ...globalFilters,
  }),
};

const getPayrollBreakdown = {
  query: Joi.object().keys({
    period: Joi.string().valid('today', 'week', 'month').default('month'),
    month: Joi.number().integer().min(1).max(12).optional(),
    year:  Joi.number().integer().min(2000).max(2100).optional(),
    ...globalFilters,
  }),
};

module.exports = {
  getDashboard,
  getQuickStats,
  getAttendanceOverview,
  getPayrollBreakdown,
};
