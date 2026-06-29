const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createTeam = {
  body: Joi.object().keys({
    teamName: Joi.string(),
    name: Joi.string(),
    teamDescription: Joi.string(),
    teamCode: Joi.string(),
    teamId: Joi.string(),
    teamLead: Joi.alternatives().try(Joi.string().custom(objectId), Joi.string()),
    teamEmployees: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
    department: Joi.alternatives().try(Joi.string().custom(objectId), Joi.string()),
    leadDepartment: Joi.alternatives().try(Joi.string().custom(objectId), Joi.string()),
  }),
};

const getTeams = {
  query: Joi.object().keys({
    teamName: Joi.string(),
    teamCode: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getTeam = {
  params: Joi.object().keys({
    teamId: Joi.string().required().custom(objectId),
  }),
};

const updateTeam = {
  params: Joi.object().keys({
    teamId: Joi.string().required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      teamName: Joi.string(),
      name: Joi.string(),
      teamDescription: Joi.string(),
      teamCode: Joi.string(),
      teamLead: Joi.alternatives().try(Joi.string().custom(objectId), Joi.string()),
      teamEmployees: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
      department: Joi.alternatives().try(Joi.string().custom(objectId), Joi.string()),
      leadDepartment: Joi.alternatives().try(Joi.string().custom(objectId), Joi.string()),
    })
    .min(1),
};

const deleteTeam = {
  params: Joi.object().keys({
    teamId: Joi.string().required().custom(objectId),
  }),
};

module.exports = {
  createTeam,
  getTeams,
  getTeam,
  updateTeam,
  deleteTeam,
};
