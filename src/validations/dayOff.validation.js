const Joi = require('joi');
const { objectId } = require('./custom.validation');
const date = Joi.date().iso();
module.exports = {
  create: { body: Joi.object({ employeeId: Joi.string().custom(objectId).required(), date: date.required(), reason: Joi.string().allow('') }) },
  list: { query: Joi.object({ employeeId: Joi.string().custom(objectId), fromDate: date, toDate: date, status: Joi.boolean(), page: Joi.number().integer().min(1), limit: Joi.number().integer().min(1), sortBy: Joi.string() }) },
  id: { params: Joi.object({ dayOffId: Joi.string().custom(objectId).required() }) },
  employee: { params: Joi.object({ employeeId: Joi.string().custom(objectId).required() }), query: Joi.object({ fromDate: date, toDate: date, status: Joi.boolean(), page: Joi.number().integer().min(1), limit: Joi.number().integer().min(1), sortBy: Joi.string() }) },
  update: { params: Joi.object({ dayOffId: Joi.string().custom(objectId).required() }), body: Joi.object({ date, reason: Joi.string().allow('') }).min(1) },
};
