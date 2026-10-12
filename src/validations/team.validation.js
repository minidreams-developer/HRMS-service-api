const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createTeam = {
  body: Joi.object().keys({
    teamName: Joi.string().allow('').optional(),
    teamDescription: Joi.string().allow('').optional(),
    teamCode: Joi.string().allow('').optional(),
    teamLead: Joi.string().custom(objectId).allow('').optional(),
    department: Joi.string().custom(objectId).allow('').optional(),
    teamEmployees: Joi.array().items(Joi.string().custom(objectId)).optional(),
    isActive: Joi.boolean().optional(),
  }).unknown(true),
};

const getTeams = {
  query: Joi.object().keys({
    // free-text search across teamName, teamCode, teamDescription
    search:       Joi.string().optional(),
    // exact / partial filters
    teamName:     Joi.string().optional(),
    teamCode:     Joi.string().optional(),
    teamLead:     Joi.string().optional(),
    departmentId: Joi.string().custom(objectId).optional(),
    branchId:     Joi.string().custom(objectId).optional(),
    isActive: Joi.boolean().optional(),
    // pagination & sorting
    sortBy:       Joi.string().optional(),
    limit:        Joi.number().integer().min(1).optional(),
    page:         Joi.number().integer().min(1).optional(),
  }),
};

const getTeam = {
  params: Joi.object().keys({
    teamId: Joi.string().custom(objectId),
  }),
};

const updateTeam = {
  params: Joi.object().keys({
    teamId: Joi.string().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      teamName: Joi.string().allow(''),
      teamDescription: Joi.string().allow(''),
      teamCode: Joi.string().allow(''),
      teamLead: Joi.string().custom(objectId).allow(''),
      department: Joi.string().custom(objectId).allow(''),
      teamEmployees: Joi.array().items(Joi.string().custom(objectId)),
      isActive: Joi.boolean(),
    })
    .unknown(true)
    .min(1),
};

const deleteTeam = {
  params: Joi.object().keys({
    teamId: Joi.string().custom(objectId),
  }),
};

const addMember = {
  params: Joi.object().keys({
    teamId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
  }),
};

const removeMember = {
  params: Joi.object().keys({
    teamId: Joi.string().custom(objectId).required(),
    userId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  createTeam,
  getTeams,
  getTeam,
  updateTeam,
  deleteTeam,
  addMember,
  removeMember,
};
