const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { leaveRequestsService } = require('../services');

const managementRoles = new Set(['manager', 'hr_manager', 'subAdmin', 'admin']);
const canManage = (user) => managementRoles.has(user.role);
const ensureSelfOrManager = (req, employeeId) => {
  if (!canManage(req.user) && String(req.user._id) !== String(employeeId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Employees may only manage their own leave');
  }
};

const createLeaveRequests = catchAsync(async (req, res) => {
  ensureSelfOrManager(req, req.body.employeeId);
  const body = { ...req.body };
  const employee = await require('../models').User.findById(body.employeeId).lean();
  if (!employee) throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  body.department = employee.workInformation?.department || body.department;
  body.designation = employee.workInformation?.designation || body.designation;
  const leaveRequest = await leaveRequestsService.createLeaveRequests(body);
  res.status(httpStatus.CREATED).send(leaveRequest);
});

const getLeaveRequests = catchAsync(async (req, res) => {
  if (!canManage(req.user)) throw new ApiError(httpStatus.FORBIDDEN, 'Only management may use the management leave list');
  const filter  = pick(req.query, ['search', 'employeeId', 'role', 'leaveType', 'status', 'departmentId', 'departmentIds', 'designation', 'designationIds', 'fromDate', 'toDate']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  if (!canManage(req.user)) filter.employeeId = req.user._id;
  const result  = await leaveRequestsService.queryLeaveRequests(filter, options);
  res.send(result);
});

const getQuickStats = catchAsync(async (req, res) => {
  if (!canManage(req.user)) throw new ApiError(httpStatus.FORBIDDEN, 'Only management may view leave quick stats');
  res.send(await leaveRequestsService.getQuickStats(req.query.period, req.query.fromDate, req.query.toDate));
});

const getLeaveRequestsById = catchAsync(async (req, res) => {
  const leaveRequest = await leaveRequestsService.getLeaveRequestsById(req.params.leaveRequestId);
  if (!leaveRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Leave request not found');
  }
  ensureSelfOrManager(req, leaveRequest.employeeId?._id || leaveRequest.employeeId);
  res.send(leaveRequest);
});

const getLeaveRequestsByEmployee = catchAsync(async (req, res) => {
  ensureSelfOrManager(req, req.params.employeeId);
  const filter = pick(req.query, ['status', 'leaveType', 'fromDate', 'toDate', 'year']);
  filter.employeeId = req.params.employeeId;
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await leaveRequestsService.queryLeaveRequests(filter, options);
  res.send(result);
});

const updateLeaveRequests = catchAsync(async (req, res) => {
  const leaveRequest = await leaveRequestsService.updateLeaveRequestsById(req.params.leaveRequestId, req.body);
  res.send(leaveRequest);
});

const updateLeaveStatus = catchAsync(async (req, res) => {
  const existing = await leaveRequestsService.getLeaveRequestsById(req.params.leaveRequestId);
  if (!existing) throw new ApiError(httpStatus.NOT_FOUND, 'Leave request not found');
  if (req.body.status === 'cancelled') ensureSelfOrManager(req, existing.employeeId?._id || existing.employeeId);
  else if (!canManage(req.user)) throw new ApiError(httpStatus.FORBIDDEN, 'Only a manager or HR/Admin may approve or reject leave');
  const reason = req.body.cancellationReason || req.body.rejectionReason;
  const leaveRequest = await leaveRequestsService.updateLeaveStatus(req.params.leaveRequestId, req.body.status, req.user._id, reason);
  res.send(leaveRequest);
});

const deleteLeaveRequests = catchAsync(async (req, res) => {
  const existing = await leaveRequestsService.getLeaveRequestsById(req.params.leaveRequestId);
  if (!existing) throw new ApiError(httpStatus.NOT_FOUND, 'Leave request not found');
  ensureSelfOrManager(req, existing.employeeId?._id || existing.employeeId);
  await leaveRequestsService.deleteLeaveRequestsById(req.params.leaveRequestId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  getQuickStats,
  createLeaveRequests,
  getLeaveRequests,
  getLeaveRequestsById,
  getLeaveRequestsByEmployee,
  updateLeaveRequests,
  updateLeaveStatus,
  deleteLeaveRequests,
};
