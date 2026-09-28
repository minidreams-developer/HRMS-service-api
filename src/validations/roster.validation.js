const Joi = require('joi');
const { objectId } = require('./custom.validation');

const create = { body: Joi.object({ employeeId: Joi.string().custom(objectId).required(), date: Joi.date().iso().required(), shiftId: Joi.string().custom(objectId).required(), notes: Joi.string().allow('').optional() }) };
const bulk = { body: Joi.object({ employeeIds: Joi.array().items(Joi.string().custom(objectId)).min(1).required(), fromDate: Joi.date().iso().required(), toDate: Joi.date().iso().required(), shiftId: Joi.string().custom(objectId).required(), notes: Joi.string().allow('').optional() }) };
const id = { params: Joi.object({ rosterId: Joi.string().custom(objectId).required() }) };
const update = { params: id.params, body: Joi.object({ shiftId: Joi.string().custom(objectId), notes: Joi.string().allow('') }).min(1) };
const list = { query: Joi.object({ date: Joi.date().iso(), fromDate: Joi.date().iso(), toDate: Joi.date().iso(), role: Joi.string().valid('employee', 'staff'), employeeId: Joi.string().custom(objectId), departmentId: Joi.string().custom(objectId), shiftId: Joi.string().custom(objectId), search: Joi.string().allow(''), status: Joi.string().valid('scheduled', 'cancelled'), page: Joi.number().integer().min(1), limit: Joi.number().integer().min(1).max(200), sortBy: Joi.string() }) };
const day = { params: Joi.object({ date: Joi.date().iso().required() }), query: Joi.object({ role: Joi.string().valid('employee', 'staff'), departmentId: Joi.string().custom(objectId), shiftId: Joi.string().custom(objectId), search: Joi.string().allow('') }) };
const employee = { params: Joi.object({ employeeId: Joi.string().custom(objectId).required() }), query: Joi.object({ fromDate: Joi.date().iso(), toDate: Joi.date().iso() }) };
module.exports = { create, bulk, id, update, list, day, employee };
