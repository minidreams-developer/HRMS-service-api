const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createOvertime = {
  body: Joi.object().keys({
    employeeId: Joi.string().custom(objectId).required(),
    requestedDate: Joi.date(),
    OvertimeDate: Joi.date(),
    startTime: Joi.date(),
    endTime: Joi.date(),
    totalDuration: Joi.number(),
  }),
};

const getOvertime = {
  query: Joi.object().keys({
    // search across linked employee's name, email, employeeId
    search:     Joi.string().optional(),
    // direct filters
    employeeId: Joi.string().custom(objectId).optional(),
    status:     Joi.string().valid('pending', 'approved').optional(),
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
      totalDuration: Joi.number(),
    })
    .min(1),
};

const updateOvertimeStatus = {
  params: Joi.object().keys({
    overtimeId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    status: Joi.string().valid('pending', 'approved').required(),
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
