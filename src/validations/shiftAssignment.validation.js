const Joi = require('joi');
const { objectId } = require('./custom.validation');
const create = { body: Joi.object({ employeeId: Joi.string().custom(objectId).required(), shiftId: Joi.string().custom(objectId).required(), effectiveFrom: Joi.date().required(), effectiveTo: Joi.date().allow(null).optional(), reason: Joi.string().allow('').optional(), assignedBy: Joi.any().optional() }) };
const employee = { params: Joi.object({ employeeId: Joi.string().custom(objectId).required() }), query: Joi.object({ fromDate: Joi.date(), page: Joi.number().integer().min(1), limit: Joi.number().integer().min(1) }) };
const id = { params: Joi.object({ assignmentId: Joi.string().custom(objectId).required() }) };
module.exports = { create, employee, id };
