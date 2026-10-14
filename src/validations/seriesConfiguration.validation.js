const Joi = require('joi');
const { objectId } = require('./custom.validation');

const bodyFields = {
  seriesName: Joi.string().trim().min(1),
  voucherType: Joi.string().valid('employee', 'staff', 'agent', 'contractor').required(),
  prefix: Joi.string().trim().allow(''),
  suffix: Joi.string().trim().allow(''),
  startingNo: Joi.number().integer().min(1),
  lengthOfZero: Joi.number().integer().min(1),
};

module.exports = {
  create: {
    body: Joi.object(bodyFields).required().custom((value, helpers) => {
      const required = ['seriesName', 'prefix', 'suffix', 'startingNo', 'lengthOfZero'];
      const missing = required.find((field) => value[field] === undefined);
      return missing ? helpers.error('any.required', { label: missing }) : value;
    }),
  },
  update: {
    params: Joi.object({ seriesId: Joi.string().custom(objectId).required() }),
    body: Joi.object({ ...bodyFields, voucherType: Joi.string().valid('employee', 'staff', 'agent', 'contractor') }).min(1),
  },
  get: {
    params: Joi.object({ seriesId: Joi.string().custom(objectId).required() }),
  },
  list: {
    query: Joi.object({
      search: Joi.string().trim().allow(''),
      seriesName: Joi.string().trim().allow(''),
      voucherType: Joi.string().trim().allow(''),
      sortBy: Joi.string(),
      page: Joi.number().integer().min(1),
      limit: Joi.number().integer().min(1).max(100),
    }),
  },
  remove: {
    params: Joi.object({ seriesId: Joi.string().custom(objectId).required() }),
  },
};
