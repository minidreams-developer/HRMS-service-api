const Joi = require('joi');
const { objectId } = require('./custom.validation');
const body = Joi.object({ designationName: Joi.string().trim().required(), designationCode: Joi.string().trim().required(), description: Joi.string().allow('').optional(), isActive: Joi.boolean().optional() });
module.exports = {
  createDesignation: { body },
  getDesignations: { query: Joi.object({ search: Joi.string(), isActive: Joi.boolean(), status: Joi.string().valid('active', 'inactive'), sortBy: Joi.string(), page: Joi.number().integer().min(1), limit: Joi.number().integer().min(1).max(100) }) },
  getDesignation: { params: Joi.object({ designationId: Joi.string().custom(objectId).required() }) },
  updateDesignation: { params: Joi.object({ designationId: Joi.string().custom(objectId).required() }), body: body.fork(['designationName', 'designationCode'], (s) => s.optional()).min(1) },
  deleteDesignation: { params: Joi.object({ designationId: Joi.string().custom(objectId).required() }) },
};
