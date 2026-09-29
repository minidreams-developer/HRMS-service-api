const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createOvertime = {
  body: Joi.object().keys({
    employeeId: Joi.string().custom(objectId).required(),
    OvertimeDate: Joi.date().required(),
    startTime: Joi.date().required(),
    endTime: Joi.date().required(),
    reason: Joi.string().trim().min(1).required(),
    totalDuration: Joi.number().optional(),
  }),
};

const getOvertime = {
  query: Joi.object().keys({
    // search across linked employee's name, email, employeeId
    search:     Joi.string().optional(),
    // direct filters
    employeeId: Joi.string().custom(objectId).optional(),
    status:     Joi.string().valid('pending', 'approved', 'rejected', 'cancelled').optional(),
    source:     Joi.string().valid('manual', 'attendance').optional(),
    // overtime date range
    fromDate:   Joi.date().iso().optional(),
    toDate:     Joi.date().iso().optional(),
    // pagination & sorting
    sortBy:     Joi.string().optional(),
    limit:      Joi.number().integer().min(1).optional(),
    page:       Joi.number().integer().min(1).optional(),
  }),
};

const getOvertimeById = {
  params: Joi.object().keys({
    overtimeId: Joi.string().custom(objectId).required(),
  }),
};

const getOvertimeByEmployee = {
  params: Joi.object().keys({
    employeeId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const updateOvertime = {
  params: Joi.object().keys({
    overtimeId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      requestedDate: Joi.date(),
      OvertimeDate: Joi.date(),
      startTime: Joi.date(),
      endTime: Joi.date(),
      reason: Joi.string().trim().min(1),
      rejectionReason: Joi.string().trim().allow(''),
      cancellationReason: Joi.string().trim().allow(''),
    })
    .min(1),
};

const updateOvertimeStatus = {
  params: Joi.object().keys({
    overtimeId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    status: Joi.string().valid('approved', 'rejected', 'cancelled').required(),
    rejectionReason: Joi.string().trim().allow('').optional(),
    cancellationReason: Joi.string().trim().allow('').optional(),
  }).custom((value, helpers) => {
    if (value.status === 'rejected' && !String(value.rejectionReason || '').trim()) return helpers.error('any.invalid');
    if (value.status === 'cancelled' && !String(value.cancellationReason || '').trim()) return helpers.error('any.invalid');
    return value;
  }),
};

const deleteOvertime = {
  params: Joi.object().keys({
    overtimeId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  createOvertime,
  getOvertime,
  getOvertimeById,
  getOvertimeByEmployee,
  updateOvertime,
  updateOvertimeStatus,
  deleteOvertime,
};
