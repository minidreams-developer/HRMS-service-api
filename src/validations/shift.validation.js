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
    // free-text search across shiftName, shiftCode, shiftType
    search:        Joi.string().optional(),
    // individual field filters
    userId:        Joi.string().custom(objectId).optional(),
    shiftName:     Joi.string().optional(),
    shiftCode:     Joi.string().optional(),
    shiftType:     Joi.string().optional(),
    isShiftActive: Joi.boolean().optional(),
    // pagination & sorting
    sortBy:        Joi.string().optional(),
    limit:         Joi.number().integer().min(1).optional(),
    page:          Joi.number().integer().min(1).optional(),
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
