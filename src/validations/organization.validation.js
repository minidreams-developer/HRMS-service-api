const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createOrganization = {
  body: Joi.object().unknown(true),
};

const getOrganizations = {
  query: Joi.object().keys({
    companyName: Joi.string(),
    email: Joi.string(),
    phone: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getOrganization = {
  params: Joi.object().keys({
    organizationId: Joi.string().custom(objectId).required(),
  }),
};

const updateOrganization = {
  params: Joi.object().keys({
    organizationId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().unknown(true).min(1),
};

const deleteOrganization = {
  params: Joi.object().keys({
    organizationId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  createOrganization,
  getOrganizations,
  getOrganization,
  updateOrganization,
  deleteOrganization,
};
