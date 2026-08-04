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
 * Query for leave requests with search and filter support.
 *
 * Filter keys:
 *   search       — regex across linked user's name, email, employeeId
 *   employeeId   — exact ObjectId match
 *   leaveType    — partial case-insensitive match
 *   status       — 'pending' | 'approved' | 'ended'
 *   departmentId — exact ObjectId match on department field
 *   fromDate     — leave starts on or after this date
 *   toDate       — leave starts on or before this date
 *
 * @param {Object} filter
 * @param {Object} options - sortBy, limit, page
 * @returns {Promise<QueryResult>}
 */
const queryLeaveRequests = async (filter, options) => {
  const mongoose = require('mongoose');
  const { User } = require('../models');
  const mongoFilter = {};

  // Search — resolve user IDs first
  if (filter.search) {
    const regex = { $regex: filter.search, $options: 'i' };
    const matchedUsers = await User.find(
      { $or: [{ name: regex }, { email: regex }, { employeeId: regex }] },
      { _id: 1 }
    ).lean();
    const userIds = matchedUsers.map((u) => u._id);
    mongoFilter.employeeId = { $in: userIds };
  }

  // Direct employeeId filter
  if (filter.employeeId && !filter.search) {
    mongoFilter.employeeId = filter.employeeId;
  }

  // Leave type filter — partial match
  if (filter.leaveType) {
    mongoFilter.leaveType = { $regex: filter.leaveType, $options: 'i' };
  }

  // Status filter
  if (filter.status) {
    mongoFilter.status = filter.status;
  }

  // Department filter
  if (filter.departmentId) {
    mongoFilter.department = filter.departmentId;
  }

  // Date range — match leaves where startDate or singleDate falls within range
  if (filter.fromDate || filter.toDate) {
    const dateConditions = [];
    const from = filter.fromDate ? new Date(filter.fromDate) : null;
    const to = filter.toDate ? (() => {
      const d = new Date(filter.toDate);
      d.setUTCHours(23, 59, 59, 999);
      return d;
    })() : null;

    if (from && to) {
      // Both bounds — startDate or singleDate in range
      dateConditions.push({ startDate: { $gte: from, $lte: to } });
      dateConditions.push({ singleDate: { $gte: from, $lte: to } });
    } else if (from) {
      dateConditions.push({ startDate: { $gte: from } });
      dateConditions.push({ singleDate: { $gte: from } });
    } else if (to) {
      dateConditions.push({ startDate: { $lte: to } });
      dateConditions.push({ singleDate: { $lte: to } });
    }

    if (dateConditions.length) {
      mongoFilter.$or = dateConditions;
    }
  }

  const populateOptions = { ...options, populate: 'employeeId,department' };
  const result = await LeaveRequests.paginate(mongoFilter, populateOptions);
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
