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
    employeeId: Joi.string().custom(objectId),
    status: Joi.string().valid('pending', 'approved'),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
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
