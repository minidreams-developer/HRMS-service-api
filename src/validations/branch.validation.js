const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createBranch = {
  body: Joi.object().unknown(true),
};

const getBranches = {
  query: Joi.object().keys({
    branchName: Joi.string(),
    branchNumber: Joi.string(),
    branchStatus: Joi.string(),
    branchType: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getBranch = {
  params: Joi.object().keys({
    branchId: Joi.string().custom(objectId).required(),
  }),
};

const updateBranch = {
  params: Joi.object().keys({
    branchId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().unknown(true).min(1),
};

const deleteBranch = {
  params: Joi.object().keys({
    branchId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  createBranch,
  getBranches,
  getBranch,
  updateBranch,
  deleteBranch,
};
