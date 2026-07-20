const Joi = require('joi');

const getDashboard = {
  query: Joi.object().keys({
    date: Joi.date().iso().optional(),
  }),
};

const getQuickStats = {
  query: Joi.object().keys({
    date: Joi.date().iso().optional(),
  }),
};

const getAttendanceOverview = {
  query: Joi.object().keys({
    date: Joi.date().iso().optional(),
  }),
};

const getPayrollBreakdown = {
  query: Joi.object().keys({
    month: Joi.number().integer().min(1).max(12).optional(),
    year:  Joi.number().integer().min(2000).max(2100).optional(),
  }),
};

module.exports = {
  getDashboard,
  getQuickStats,
  getAttendanceOverview,
  getPayrollBreakdown,
};
