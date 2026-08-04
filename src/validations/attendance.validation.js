const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createAttendance = {
  body: Joi.object().keys({
    employeeId: Joi.string().custom(objectId).required(),
    date: Joi.date().required(),
    shiftId: Joi.string().custom(objectId).allow('').optional(),
    shift: Joi.alternatives().try(Joi.string().custom(objectId), Joi.string()).optional(),
    loginTime: Joi.date().allow(null, '').optional(),
    logoutTime: Joi.date().allow(null, '').optional(),
    checkInTime: Joi.date().allow(null, '').optional(),
    checkOutTime: Joi.date().allow(null, '').optional(),
    IsOverTimeWoked: Joi.boolean().optional(),
    overTimeWorkedHours: Joi.number().min(0).optional(),
    totalWorkedHours: Joi.number().min(0).optional(),
    attendanceStatus: Joi.string().valid('onTime', 'earlyOut', 'arrivedLate').optional(),
    remarks: Joi.string().allow('').optional(),
  }),
};

const getAttendances = {
  query: Joi.object().keys({
    // search across linked employee's name, email, employeeId
    search:           Joi.string().optional(),
    // direct field filters
    employeeId:       Joi.string().custom(objectId).optional(),
    shiftId:          Joi.string().custom(objectId).optional(),
    attendanceStatus: Joi.string().valid('onTime', 'earlyOut', 'arrivedLate').optional(),
    // date range on attendance date
    fromDate:         Joi.date().iso().optional(),
    toDate:           Joi.date().iso().optional(),
    // single exact date (existing behaviour preserved)
    date:             Joi.date().optional(),
    // pagination & sorting
    sortBy:           Joi.string().optional(),
    limit:            Joi.number().integer().min(1).optional(),
    page:             Joi.number().integer().min(1).optional(),
  }),
};

const getAttendance = {
  params: Joi.object().keys({
    attendanceId: Joi.string().custom(objectId).required(),
  }),
};

const updateAttendance = {
  params: Joi.object().keys({
    attendanceId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      date: Joi.date(),
      shiftId: Joi.string().custom(objectId).allow(''),
      shift: Joi.alternatives().try(Joi.string().custom(objectId), Joi.string()),
      loginTime: Joi.date().allow(null, ''),
      logoutTime: Joi.date().allow(null, ''),
      checkInTime: Joi.date().allow(null, ''),
      checkOutTime: Joi.date().allow(null, ''),
      IsOverTimeWoked: Joi.boolean(),
      overTimeWorkedHours: Joi.number().min(0),
      totalWorkedHours: Joi.number().min(0),
      attendanceStatus: Joi.string().valid('onTime', 'earlyOut', 'arrivedLate'),
      remarks: Joi.string().allow(''),
    })
    .min(1),
};

const deleteAttendance = {
  params: Joi.object().keys({
    attendanceId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  createAttendance,
  getAttendances,
  getAttendance,
  updateAttendance,
  deleteAttendance,
};
