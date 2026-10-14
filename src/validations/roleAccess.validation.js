const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createRole = {
  body: Joi.object().unknown(true),
};

const getRoles = {
  query: Joi.object().keys({
    name:         Joi.string(),
    description:  Joi.string(),
    search:       Joi.string(),
    isSystemRole: Joi.boolean(),
    isDefault:    Joi.boolean(),
    isActive:     Joi.boolean(),
    sortBy:       Joi.string(),
    limit:        Joi.number().integer(),
    page:         Joi.number().integer(),
  }),
};

const getRole = {
  params: Joi.object().keys({
    roleId: Joi.string().custom(objectId).required(),
  }),
};

const updateRole = {
  params: Joi.object().keys({
    roleId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().unknown(true).min(1),
};

const deleteRole = {
  params: Joi.object().keys({
    roleId: Joi.string().custom(objectId).required(),
  }),
};

const getRolePermissions = {
  params: Joi.object().keys({
    roleId: Joi.string().custom(objectId).required(),
  }),
};

const updateRolePermissions = {
  params: Joi.object().keys({
    roleId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().unknown(true),
};

const updateModulePermissions = {
  params: Joi.object().keys({
    roleId: Joi.string().custom(objectId).required(),
    group:  Joi.string().required(),
    module: Joi.string().required(),
  }),
  body: Joi.object().unknown(true).min(1),
};

const cloneRole = {
  params: Joi.object().keys({
    roleId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    newName: Joi.string().required(),
  }),
};

module.exports = {
  createRole,
  getRoles,
  getRole,
  updateRole,
  deleteRole,
  getRolePermissions,
  updateRolePermissions,
  updateModulePermissions,
  cloneRole,
};
