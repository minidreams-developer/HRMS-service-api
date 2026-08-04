const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { leaveRequestsService } = require('../services');

const createLeaveRequests = catchAsync(async (req, res) => {
  const leaveRequest = await leaveRequestsService.createLeaveRequests(req.body);
  res.status(httpStatus.CREATED).send(leaveRequest);
});

const getLeaveRequests = catchAsync(async (req, res) => {
  const filter  = pick(req.query, ['search', 'employeeId', 'leaveType', 'status', 'departmentId', 'fromDate', 'toDate']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result  = await leaveRequestsService.queryLeaveRequests(filter, options);
  res.send(result);
});

const getLeaveRequestsById = catchAsync(async (req, res) => {
  const leaveRequest = await leaveRequestsService.getLeaveRequestsById(req.params.leaveRequestId);
  if (!leaveRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Leave request not found');
  }
  res.send(leaveRequest);
});

const getLeaveRequestsByEmployee = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await leaveRequestsService.getLeaveRequestsByEmployee(req.params.employeeId, options);
  res.send(result);
});

const updateLeaveRequests = catchAsync(async (req, res) => {
  const leaveRequest = await leaveRequestsService.updateLeaveRequestsById(req.params.leaveRequestId, req.body);
  res.send(leaveRequest);
});

const updateLeaveStatus = catchAsync(async (req, res) => {
  const leaveRequest = await leaveRequestsService.updateLeaveStatus(req.params.leaveRequestId, req.body.status);
  res.send(leaveRequest);
});

const deleteLeaveRequests = catchAsync(async (req, res) => {
  await leaveRequestsService.deleteLeaveRequestsById(req.params.leaveRequestId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createLeaveRequests,
  getLeaveRequests,
  getLeaveRequestsById,
  getLeaveRequestsByEmployee,
  updateLeaveRequests,
  updateLeaveStatus,
  deleteLeaveRequests,
};
