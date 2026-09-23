const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createBalance = {
  body: Joi.object().keys({
    employeeId: Joi.string().custom(objectId).required(),
    leaveType: Joi.string().trim().min(1).required(),
    year: Joi.number().integer().min(2000).max(2100).required(),
    allocated: Joi.number().min(0).required(),
    isPaid: Joi.boolean().required(),
    requiresBalance: Joi.boolean().required(),
  }),
};

const updateBalance = {
  params: Joi.object().keys({ balanceId: Joi.string().custom(objectId).required() }),
  body: Joi.object().keys({
    allocated: Joi.number().min(0),
    isPaid: Joi.boolean(),
    requiresBalance: Joi.boolean(),
    used: Joi.any().forbidden(),
    remaining: Joi.any().forbidden(),
  }).min(1),
};

const employeeBalances = {
  params: Joi.object().keys({ employeeId: Joi.string().custom(objectId).required() }),
  query: Joi.object().keys({ year: Joi.number().integer().min(2000).max(2100).optional() }),
};

const balance = { params: Joi.object().keys({ balanceId: Joi.string().custom(objectId).required() }) };

module.exports = { createBalance, updateBalance, employeeBalances, balance };
