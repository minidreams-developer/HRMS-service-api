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
  }),
};

const getLeaveRequests = {
  query: Joi.object().keys({
    // search across linked employee's name, email, employeeId
    search:       Joi.string().optional(),
    // direct filters
    employeeId:   Joi.string().custom(objectId).optional(),
    leaveType:    Joi.string().optional(),
    status:       Joi.string().valid('pending', 'approved', 'ended').optional(),
    departmentId: Joi.string().custom(objectId).optional(),
    // date range — covers startDate / singleDate
    fromDate:     Joi.date().iso().optional(),
    toDate:       Joi.date().iso().optional(),
    // pagination & sorting
    sortBy:       Joi.string().optional(),
    limit:        Joi.number().integer().min(1).optional(),
    page:         Joi.number().integer().min(1).optional(),
  }),
};

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
    status: Joi.string().valid('pending', 'approved', 'ended').required(),
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
  getLeaveRequestById,
  getLeaveRequestsByEmployee,
  updateLeaveRequest,
  updateLeaveStatus,
  deleteLeaveRequest,
};
