const Joi = require('joi');
const { objectId } = require('./custom.validation');

const getHierarchyTree = {
  query: Joi.object().keys({
    rootId:   Joi.string().custom(objectId).optional(),
    maxDepth: Joi.number().integer().min(1).max(10).optional(),
  }),
};

const getHierarchyByRole = {
  query: Joi.object().keys({}),
};

const getReportingChain = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
  }),
};
const getDirectReports = { params: Joi.object({ managerId: Joi.string().custom(objectId).required() }), query: Joi.object({ role: Joi.string(), status: Joi.string(), branch: Joi.string().custom(objectId), department: Joi.string().custom(objectId), team: Joi.string().custom(objectId), search: Joi.string(), page: Joi.number().integer().min(1), limit: Joi.number().integer().min(1).max(100), sortBy: Joi.string() }) };

module.exports = {
  getHierarchyTree,
  getHierarchyByRole,
  getReportingChain,
  getDirectReports,
};
