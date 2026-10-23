const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createLeaveRequest = {
  body: Joi.object().keys({
    employeeId: Joi.string().custom(objectId).required(),
    leaveType: Joi.string().required(),
    startDate: Joi.date().allow(null, '').optional(),
    endDate: Joi.date().allow(null, '').when('startDate', {
      is: Joi.date().required(),
      then: Joi.date().min(Joi.ref('startDate')),
      otherwise: Joi.date().allow(null, '').optional(),
    }),
    singleDate: Joi.date().allow(null, '').optional(),
    department: Joi.string().custom(objectId).optional(),
    designation: Joi.string().optional(),
    reason: Joi.string().optional(),
    leaveDuration: Joi.string().valid('fullDay', 'halfDay').default('fullDay'),
    halfDaySession: Joi.string().valid('firstHalf', 'secondHalf').allow(null, '').optional(),
  }).custom((value, helpers) => {
    const hasSingle = Boolean(value.singleDate);
    const hasRange = Boolean(value.startDate || value.endDate);
    if (hasSingle === hasRange) return helpers.error('any.invalid');
    if (value.leaveDuration === 'halfDay' && (!hasSingle || !value.halfDaySession)) return helpers.error('any.invalid');
    if (value.leaveDuration === 'fullDay' && value.halfDaySession) return helpers.error('any.invalid');
    if (hasRange && (!value.startDate || !value.endDate)) return helpers.error('any.invalid');
    return value;
  }),
};

const getLeaveRequests = {
  query: Joi.object().keys({
    // search across linked employee's name, email, employeeId
    search:       Joi.string().optional(),
    // direct filters
    employeeId:   Joi.string().custom(objectId).optional(),
    role:         Joi.string().valid('employee', 'staff').optional(),
    leaveType:    Joi.string().optional(),
    status:       Joi.string().valid('pending', 'approved', 'rejected', 'cancelled', 'ended').optional(),
    departmentId: Joi.string().custom(objectId).optional(),
    departmentIds: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string().custom(objectId))).optional(),
    designation: Joi.string().optional(),
    designationIds: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string().custom(objectId))).optional(),
    // date range — covers startDate / singleDate
    fromDate:     Joi.date().iso().optional(),
    toDate:       Joi.date().iso().optional(),
    // pagination & sorting
    sortBy:       Joi.string().optional(),
    limit:        Joi.number().integer().min(1).optional(),
    page:         Joi.number().integer().min(1).optional(),
  }),
};

const getQuickStats = Joi.object({
  period: Joi.string().valid('today', 'week', 'month').default('today'),
  fromDate: Joi.date().iso().optional(),
  toDate: Joi.date().iso().min(Joi.ref('fromDate')).optional(),
});

const getLeaveRequestById = {
  params: Joi.object().keys({
    leaveRequestId: Joi.string().custom(objectId).required(),
  }),
};

const getLeaveRequestsByEmployee = {
  params: Joi.object().keys({
    employeeId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    status: Joi.string().valid('pending', 'approved', 'rejected', 'cancelled', 'ended'),
    leaveType: Joi.string(),
    fromDate: Joi.date().iso(),
    toDate: Joi.date().iso(),
    year: Joi.number().integer().min(2000).max(2100),
  }),
};

const updateLeaveRequest = {
  params: Joi.object().keys({
    leaveRequestId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      leaveType: Joi.string(),
      startDate: Joi.date(),
      endDate: Joi.date(),
      singleDate: Joi.date(),
      department: Joi.string().custom(objectId),
      designation: Joi.string(),
      reason: Joi.string(),
    })
    .min(1),
};

const updateLeaveStatus = {
  params: Joi.object().keys({
    leaveRequestId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    status: Joi.string().valid('approved', 'rejected', 'cancelled').required(),
    cancellationReason: Joi.string().allow('').optional(),
    rejectionReason: Joi.string().allow('').optional(),
  }).custom((value, helpers) => {
    if (value.status === 'cancelled' && !String(value.cancellationReason || '').trim()) return helpers.error('any.invalid');
    return value;
  }),
};

const deleteLeaveRequest = {
  params: Joi.object().keys({
    leaveRequestId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  createLeaveRequest,
  getLeaveRequests,
  getQuickStats,
  getLeaveRequestById,
  getLeaveRequestsByEmployee,
  updateLeaveRequest,
  updateLeaveStatus,
  deleteLeaveRequest,
};
