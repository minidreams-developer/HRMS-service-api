const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createBranch = {
  body: Joi.object().keys({
    branchName: Joi.string(),
    name: Joi.string(),
    branchHead: Joi.alternatives().try(Joi.string().custom(objectId), Joi.string()),
    branchNumber: Joi.string(),
    branchType: Joi.string(),
    activeStatus: Joi.string().valid('active', 'inactive'),
    status: Joi.string(),
    effectiveFromDate: Joi.date(),
    phoneNumber: Joi.string(),
    emergencyContact: Joi.string(),
    email: Joi.string().email(),
    address: Joi.string(),
    city: Joi.string(),
    district: Joi.string(),
    state: Joi.string(),
    pinCode: Joi.string(),
    geoLocation: Joi.string(),
    departments: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
    shifts: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
  }),
};

const getBranches = {
  query: Joi.object().keys({
    branchName: Joi.string(),
    activeStatus: Joi.string().valid('active', 'inactive'),
    status: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getBranch = {
  params: Joi.object().keys({
    branchId: Joi.string().required().custom(objectId),
  }),
};

const updateBranch = {
  params: Joi.object().keys({
    branchId: Joi.string().required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      branchName: Joi.string(),
      name: Joi.string(),
      branchHead: Joi.alternatives().try(Joi.string().custom(objectId), Joi.string()),
      branchNumber: Joi.string(),
      branchType: Joi.string(),
      activeStatus: Joi.string().valid('active', 'inactive'),
      status: Joi.string(),
      effectiveFromDate: Joi.date(),
      phoneNumber: Joi.string(),
      emergencyContact: Joi.string(),
      email: Joi.string().email(),
      address: Joi.string(),
      city: Joi.string(),
      district: Joi.string(),
      state: Joi.string(),
      pinCode: Joi.string(),
      geoLocation: Joi.string(),
      departments: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
      shifts: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
    })
    .min(1),
};

const deleteBranch = {
  params: Joi.object().keys({
    branchId: Joi.string().required().custom(objectId),
  }),
};

module.exports = {
  createBranch,
  getBranches,
  getBranch,
  updateBranch,
  deleteBranch,
};
