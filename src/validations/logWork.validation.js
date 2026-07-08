const Joi = require('joi');
const { objectId } = require('./custom.validation');

// ─── Reusable sub-schema ──────────────────────────────────────────────────────

const jobItemSchema = Joi.object({
  contractorJobItem: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required(),
  unit: Joi.string().trim(),
  pricePerUnit: Joi.number().min(0).default(0),
  total: Joi.number().min(0),
  remarks: Joi.string().trim().allow(''),
});

// ─── Endpoints ────────────────────────────────────────────────────────────────

const createLogWork = {
  body: Joi.object().keys({
    contractorId: Joi.string().required(),
    branch: Joi.string().required(),
    entryDate: Joi.date().default(() => new Date()),
    workDoneDate: Joi.date().required(),
    reference: Joi.string().trim().allow(''),
    jobItems: Joi.array().items(jobItemSchema).min(1).required(),
    attachments: Joi.array().items(Joi.string().trim()).default([]),
  }),
};

const getLogWorks = {
  query: Joi.object().keys({
    branch: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getLogsByContractor = {
  params: Joi.object().keys({
    contractorId: Joi.string().required(),
  }),
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getLogWork = {
  params: Joi.object().keys({
    logId: Joi.string().custom(objectId).required(),
  }),
};

const updateLogWork = {
  params: Joi.object().keys({
    logId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      branch: Joi.string(),
      entryDate: Joi.date(),
      workDoneDate: Joi.date(),
      reference: Joi.string().trim().allow(''),
      jobItems: Joi.array().items(jobItemSchema).min(1),
      attachments: Joi.array().items(Joi.string().trim()),
    })
    .min(1),
};

const deleteLogWork = {
  params: Joi.object().keys({
    logId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  createLogWork,
  getLogWorks,
  getLogsByContractor,
  getLogWork,
  updateLogWork,
  deleteLogWork,
};
