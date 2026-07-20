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

module.exports = {
  getHierarchyTree,
  getHierarchyByRole,
  getReportingChain,
};
