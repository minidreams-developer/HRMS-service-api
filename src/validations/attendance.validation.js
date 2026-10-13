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
    attendanceCategory: Joi.string().valid('fullDay', 'halfDay', 'absent').optional(),
    timingStatus: Joi.string().valid('onTime', 'earlyOut', 'arrivedLate').optional(),
    attendanceStatus: Joi.string().valid('onTime', 'earlyOut', 'arrivedLate').optional(),
    remarks: Joi.string().allow('').optional(),
    createdReason: Joi.string().trim().allow('').optional(),
    createdBy: Joi.any().strip(),
    creationSource: Joi.any().strip(),
  }),
};

const getAttendances = {
  query: Joi.object().keys({
    // search across linked employee's name, email, employeeId
    search:           Joi.string().optional(),
    // direct field filters
    employeeId:       Joi.string().custom(objectId).optional(),
    role:             Joi.string().valid('employee', 'staff', 'manager', 'hr_manager', 'subAdmin', 'admin', 'agent', 'contractor', 'team_lead').optional(),
    department:       Joi.string().trim().optional(),
    departmentId:     Joi.string().custom(objectId).optional(),
    shift:            Joi.string().trim().optional(),
    shiftId:          Joi.string().custom(objectId).optional(),
    attendanceStatus: Joi.string().valid('onTime', 'earlyOut', 'arrivedLate').optional(),
    timingStatus:     Joi.string().valid('onTime', 'earlyOut', 'arrivedLate').optional(),
    attendanceCategory: Joi.string().valid('fullDay', 'halfDay', 'absent').optional(),
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

const getEmployeeAttendanceSummary = {
  params: Joi.object().keys({
    employeeId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    fromDate: Joi.date().iso().required(),
    toDate: Joi.date().iso().required(),
  }),
};

const getEmployeeAttendance = {
  params: Joi.object().keys({ employeeId: Joi.string().custom(objectId).required() }),
  query: Joi.object().keys({
    date: Joi.date().iso(), fromDate: Joi.date().iso(), toDate: Joi.date().iso(),
    attendanceCategory: Joi.string().valid('fullDay', 'halfDay', 'absent'),
    timingStatus: Joi.string().valid('onTime', 'earlyOut', 'arrivedLate'),
    sortBy: Joi.string(), limit: Joi.number().integer().min(1), page: Joi.number().integer().min(1),
  }),
};

const getEmployeeAttendanceCalendar = {
  params: Joi.object().keys({ employeeId: Joi.string().custom(objectId).required() }),
  query: Joi.object().keys({ fromDate: Joi.date().iso().required(), toDate: Joi.date().iso().required() }),
};

const updateAttendance = {
  params: Joi.object().keys({
    attendanceId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      date: Joi.date(),
      shiftId: Joi.string().custom(objectId).allow(''),
      loginTime: Joi.date().allow(null, ''),
      logoutTime: Joi.date().allow(null, ''),
      attendanceCategory: Joi.string().valid('fullDay', 'halfDay', 'absent'),
      remarks: Joi.string().allow(''),
      // Accepted for compatibility, but ignored and never persisted from the client.
      totalWorkedHours: Joi.any().strip(),
      overTimeWorkedHours: Joi.any().strip(),
      IsOverTimeWoked: Joi.any().strip(),
      editReason: Joi.string().trim().min(1).required(),
    })
    .min(1),
};

const deleteAttendance = {
  params: Joi.object().keys({
    attendanceId: Joi.string().custom(objectId).required(),
  }),
};

const getQuickStats = {
  query: Joi.object().keys({
    fromDate: Joi.date().iso().optional(),
    toDate: Joi.date().iso().min(Joi.ref('fromDate')).optional(),
  }),
};

module.exports = {
  createAttendance,
  getAttendances,
  getAttendance,
  getEmployeeAttendanceSummary,
  getEmployeeAttendance,
  getEmployeeAttendanceCalendar,
  updateAttendance,
  deleteAttendance,
  getQuickStats,
};
