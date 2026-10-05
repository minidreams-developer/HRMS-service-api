const Joi = require('joi');
const { objectId } = require('./custom.validation');

const breakSchema = Joi.object().keys({
  breakName: Joi.string().allow('').optional(),
  duration: Joi.number().min(0).optional(),
  startTime: Joi.string().allow('').optional(),
  endTime: Joi.string().allow('').optional(),
});

const timingSchema = Joi.object().keys({
  day: Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday').required(),
  startTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).when('off', { is: true, then: Joi.optional().allow(''), otherwise: Joi.required() }),
  endTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).when('off', { is: true, then: Joi.optional().allow(''), otherwise: Joi.required() }),
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

const workingHoursString = Joi.string().pattern(/^\d+(?:\.\d+)?h$/).optional();

const rotationSchema = Joi.object({
  shiftIds: Joi.array().items(Joi.string().custom(objectId)).min(2).required(),
  rotationType: Joi.string().valid('Weekly').required(),
  rotationDuration: Joi.number().integer().min(1).required(),
  effectiveStartDate: Joi.date().iso().required(),
});

const shiftBody = Joi.object().keys({
  // Lowercase Fixed/Flexible values exist in legacy records; Rotational uses
  // the new product value and is intentionally case-sensitive.
  shiftType: Joi.string().valid('Fixed', 'Flexible', 'fixed', 'flexible', 'Rotational').optional(),
  rotation: rotationSchema.when('shiftType', { is: 'Rotational', then: Joi.required(), otherwise: Joi.optional() }),
  timings: Joi.array().items(timingSchema).custom((items, helpers) => {
    const days = items.map((item) => item.day.toLowerCase());
    if (new Set(days).size !== days.length) return helpers.error('any.invalid');
    for (const item of items) if (!item.off && item.startTime === item.endTime) return helpers.error('any.invalid');
    return items;
  }).when('shiftType', { is: 'Rotational', then: Joi.forbidden(), otherwise: Joi.optional() }),
  totalShiftDuration: Joi.string().pattern(/^\d+(?:\.\d+)?h$/).optional(),
  weekOff: Joi.array().items(Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')).optional(),
  breakManagement: breakManagementSchema,
  gracePeriod: gracePeriodSchema,
  attendanceRules: attendanceRulesSchema,
  isShiftActive: Joi.boolean(),
  minWorkingHours: workingHoursString,
  halfDayWorkingHours: workingHoursString,
  overtimeAfterHours: Joi.number().greater(0).optional(),
}).unknown(true).custom((value, helpers) => {
  if (value.minWorkingHours || value.halfDayWorkingHours) {
    if (!value.minWorkingHours || !value.halfDayWorkingHours) return helpers.error('any.invalid');
    const full = Number.parseFloat(value.minWorkingHours);
    const half = Number.parseFloat(value.halfDayWorkingHours);
    const total = value.totalShiftDuration ? Number.parseFloat(value.totalShiftDuration) : null;
    if (!(full > 0) || !(half > 0) || half > full || (total !== null && full > total)) {
      return helpers.error('any.invalid');
    }
  }
  return value;
});

const createShift = {
  body: shiftBody,
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
  body: shiftBody.min(1),
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
