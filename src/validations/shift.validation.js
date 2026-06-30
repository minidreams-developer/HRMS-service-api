const Joi = require('joi');
const { objectId } = require('./custom.validation');

const breakSchema = Joi.object().keys({
  breakName: Joi.string().allow('').optional(),
  duration: Joi.number().min(0).optional(),
  startTime: Joi.string().allow('').optional(),
  endTime: Joi.string().allow('').optional(),
});

const timingSchema = Joi.object().keys({
  day: Joi.string().allow('').optional(),
  startTime: Joi.string().allow('').optional(),
  endTime: Joi.string().allow('').optional(),
  off: Joi.boolean().optional(),
});

const gracePeriodSchema = Joi.object().keys({
  earlyCheckIn: Joi.number().min(0).optional(),
  lateCheckIn: Joi.number().min(0).optional(),
  earlyCheckOut: Joi.number().min(0).optional(),
  lateCheckOut: Joi.number().min(0).optional(),
}).optional();

const breakManagementSchema = Joi.object().keys({
  enabled: Joi.boolean().optional(),
  breakType: Joi.string().allow('').optional(),
  duration: Joi.number().min(0).optional(),
  multipleBreaksSupport: Joi.boolean().optional(),
  breaks: Joi.array().items(breakSchema).optional(),
}).optional();

const attendanceRulesSchema = Joi.object().keys({
  lateMarkAfter: Joi.number().min(0).optional(),
  autoHalfDayAfterLate: Joi.number().min(0).optional(),
}).optional();

const createShift = {
  body: Joi.object().unknown(true),
};

const getShifts = {
  query: Joi.object().keys({
    userId: Joi.string().custom(objectId),
    shiftName: Joi.string(),
    shiftCode: Joi.string(),
    shiftType: Joi.string(),
    isShiftActive: Joi.boolean(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getShift = {
  params: Joi.object().keys({
    shiftId: Joi.string().custom(objectId).required(),
  }),
};

const updateShift = {
  params: Joi.object().keys({
    shiftId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().unknown(true).min(1),
};

const deleteShift = {
  params: Joi.object().keys({
    shiftId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  createShift,
  getShifts,
  getShift,
  updateShift,
  deleteShift,
};
