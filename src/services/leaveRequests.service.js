const httpStatus = require('http-status');
const { LeaveRequests } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a leave request
 * @param {Object} body
 * @returns {Promise<LeaveRequests>}
 */
const createLeaveRequests = async (body) => {
  return LeaveRequests.create(body);
};

/**
 * Query for leave requests
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryLeaveRequests = async (filter, options) => {
  const populateOptions = { ...options, populate: 'employeeId,department' };
  const result = await LeaveRequests.paginate(filter, populateOptions);
  return result;
};

/**
 * Get leave request by id
 * @param {ObjectId} id
 * @returns {Promise<LeaveRequests>}
 */
const getLeaveRequestsById = async (id) => {
  return LeaveRequests.findById(id).populate('employeeId', 'name employeeId email').populate('department', 'departmentName departmentCode');
};

/**
 * Get leave requests by employeeId
 * @param {ObjectId} employeeId
 * @returns {Promise<LeaveRequests[]>}
 */
const getLeaveRequestsByEmployee = async (employeeId, options) => {
  return LeaveRequests.paginate({ employeeId }, options);
};

/**
 * Update leave request by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<LeaveRequests>}
 */
const updateLeaveRequestsById = async (id, updateBody) => {
  const leaveRequest = await getLeaveRequestsById(id);
  if (!leaveRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Leave request not found');
  }
  Object.assign(leaveRequest, updateBody);
  await leaveRequest.save();
  return leaveRequest;
};

/**
 * Update leave request status (approve / reject)
 * @param {ObjectId} id
 * @param {string} status
 * @returns {Promise<LeaveRequests>}
 */
const updateLeaveStatus = async (id, status) => {
  const leaveRequest = await LeaveRequests.findById(id);
  if (!leaveRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Leave request not found');
  }
  leaveRequest.status = status;
  await leaveRequest.save();
  return leaveRequest;
};

/**
 * Delete leave request by id
 * @param {ObjectId} id
 * @returns {Promise<LeaveRequests>}
 */
const deleteLeaveRequestsById = async (id) => {
  const leaveRequest = await getLeaveRequestsById(id);
  if (!leaveRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Leave request not found');
  }
  await leaveRequest.deleteOne();
  return leaveRequest;
};

module.exports = {
  createLeaveRequests,
  queryLeaveRequests,
  getLeaveRequestsById,
  getLeaveRequestsByEmployee,
  updateLeaveRequestsById,
  updateLeaveStatus,
  deleteLeaveRequestsById,
};
