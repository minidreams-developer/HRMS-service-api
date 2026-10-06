const Joi = require('joi');
const { objectId } = require('./custom.validation');

const role = Joi.string().valid('employee', 'staff').required();
const date = Joi.date().iso();
const common = {
  role,
  search: Joi.string().allow(''),
  departmentId: Joi.string().custom(objectId),
  shiftId: Joi.string().custom(objectId),
  status: Joi.string().valid('onTime', 'arrivedLate', 'earlyOut', 'fullDay', 'halfDay', 'absent', 'leave', 'holiday', 'dayOff', 'weekOff', 'noAttendance'),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(200),
  sortBy: Joi.string(),
};

module.exports = {
  stats: { query: Joi.object({ date, role }) },
  quickStats: { query: Joi.object({
    role,
    period: Joi.string().valid('today', 'week', 'month', 'last30days').default('last30days'),
    fromDate: date,
    toDate: date,
    search: Joi.string().allow(''),
    departmentId: Joi.string().custom(objectId),
    shiftId: Joi.string().custom(objectId),
  }) },
  day: { query: Joi.object({ ...common, date: date.required() }) },
  week: { query: Joi.object({ ...common, startDate: date.required() }) },
  dateDetail: { params: Joi.object({ employeeId: Joi.string().custom(objectId).required(), date: date.required() }) },
};
