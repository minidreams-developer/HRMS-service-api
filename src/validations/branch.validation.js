const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createBranch = {
  body: Joi.object().unknown(true),
};

const getBranches = {
  query: Joi.object().keys({
    // free-text search across branchName, branchNumber, city, state
    search:       Joi.string().optional(),
    // individual field filters
    branchName:   Joi.string().optional(),
    branchNumber: Joi.string().optional(),
    branchStatus: Joi.string().valid('active', 'inactive').optional(),
    branchType:   Joi.string().optional(),
    city:         Joi.string().optional(),
    state:        Joi.string().optional(),
    // pagination & sorting
    sortBy:       Joi.string().optional(),
    limit:        Joi.number().integer().min(1).optional(),
    page:         Joi.number().integer().min(1).optional(),
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
