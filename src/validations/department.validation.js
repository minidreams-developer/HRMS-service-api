const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createDepartment = {
  body: Joi.object().keys({
    departmentName: Joi.string().required(),
    departmentDescription: Joi.string().allow('').optional(),
    departmentCode: Joi.string().required(),
    departmentHead: Joi.string().custom(objectId).allow('').optional(),
    departmentEmployees: Joi.array().items(Joi.string().custom(objectId)).optional(),
    departmentTeams: Joi.array().items(Joi.string().custom(objectId)).optional(),
  }),
};

const getDepartments = {
  query: Joi.object().keys({
    departmentName: Joi.string(),
    departmentCode: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getDepartment = {
  params: Joi.object().keys({
    departmentId: Joi.string().custom(objectId).required(),
  }),
};

const updateDepartment = {
  params: Joi.object().keys({
    departmentId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      departmentName: Joi.string(),
      departmentDescription: Joi.string().allow(''),
      departmentCode: Joi.string(),
      departmentHead: Joi.string().custom(objectId).allow(''),
      departmentEmployees: Joi.array().items(Joi.string().custom(objectId)),
      departmentTeams: Joi.array().items(Joi.string().custom(objectId)),
    })
    .min(1),
};

const deleteDepartment = {
  params: Joi.object().keys({
    departmentId: Joi.string().custom(objectId).required(),
  }),
};

const addMember = {
  params: Joi.object().keys({
    departmentId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
  }),
};

const addTeam = {
  params: Joi.object().keys({
    departmentId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    teamId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  createDepartment,
  getDepartments,
  getDepartment,
  updateDepartment,
  deleteDepartment,
  addMember,
  addTeam,
};
