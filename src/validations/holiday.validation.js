const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createHoliday = {
  body: Joi.object().keys({
    holidayTitle:   Joi.string().optional(),
    description:    Joi.string().optional(),
    month:          Joi.number().integer().min(1).max(12).optional(),
    date:           Joi.date().optional(),
    nextWorkingDay: Joi.date().optional(),
    status:         Joi.boolean().optional(),
    holidayImage:   Joi.string().optional(),
    Remarks:        Joi.string().optional(),
    people:         Joi.array().items(Joi.string().custom(objectId)).optional(),
  }).unknown(true),
};

const getHolidays = {
  query: Joi.object().keys({
    // free-text search across holidayTitle, description, Remarks
    search:       Joi.string().optional(),
    // individual field filters
    holidayTitle: Joi.string().optional(),
    month:        Joi.number().integer().min(1).max(12).optional(),
    status:       Joi.boolean().optional(),
    // date range on holiday date
    fromDate:     Joi.date().iso().optional(),
    toDate:       Joi.date().iso().optional(),
    // pagination & sorting
    sortBy:       Joi.string().optional(),
    limit:        Joi.number().integer().min(1).optional(),
    page:         Joi.number().integer().min(1).optional(),
  }),
};

const getHoliday = {
  params: Joi.object().keys({
    holidayId: Joi.string().custom(objectId).required(),
  }),
};

const updateHoliday = {
  params: Joi.object().keys({
    holidayId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      holidayTitle:   Joi.string(),
      description:    Joi.string(),
      month:          Joi.number().integer().min(1).max(12),
      date:           Joi.date(),
      nextWorkingDay: Joi.date(),
      status:         Joi.boolean(),
      holidayImage:   Joi.string(),
      Remarks:        Joi.string(),
      people:         Joi.array().items(Joi.string().custom(objectId)),
    })
    .min(1),
};

const deleteHoliday = {
  params: Joi.object().keys({
    holidayId: Joi.string().custom(objectId).required(),
  }),
};

const addPerson = {
  params: Joi.object().keys({
    holidayId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
  }),
};

const removePerson = {
  params: Joi.object().keys({
    holidayId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  createHoliday,
  getHolidays,
  getHoliday,
  updateHoliday,
  deleteHoliday,
  addPerson,
  removePerson,
};
