const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { overtimeManagementService } = require('../services');
const managementRoles = new Set(['manager', 'hr_manager', 'subAdmin', 'admin']);
const canManage = (user) => managementRoles.has(user.role);

const createOvertime = catchAsync(async (req, res) => {
  if (!canManage(req.user) && String(req.body.employeeId) !== String(req.user._id)) throw new ApiError(httpStatus.FORBIDDEN, 'Employees may only create their own overtime');
  const overtime = await overtimeManagementService.createOvertime(req.body, req.user);
  res.status(httpStatus.CREATED).send(overtime);
});

const getOvertime = catchAsync(async (req, res) => {
  const filter  = pick(req.query, ['search', 'employeeId', 'status', 'source', 'fromDate', 'toDate']);
  if (!canManage(req.user)) filter.employeeId = req.user._id;
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result  = await overtimeManagementService.queryOvertime(filter, options);
  res.send(result);
});

const getQuickStats = catchAsync(async (req, res) => {
  if (!canManage(req.user)) throw new ApiError(httpStatus.FORBIDDEN, 'Only management may view overtime quick stats');
  res.send(await overtimeManagementService.getQuickStats(req.query.period, req.query.fromDate, req.query.toDate));
});

const approveAll = catchAsync(async (req, res) => {
  res.send(await overtimeManagementService.approveAll(req.query, req.user));
});

const getOvertimeById = catchAsync(async (req, res) => {
  const overtime = await overtimeManagementService.getOvertimeById(req.params.overtimeId);
  if (!overtime) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Overtime request not found');
  }
  if (!canManage(req.user) && String(overtime.employee?._id) !== String(req.user._id)) throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  res.send(overtime);
});

const getOvertimeByEmployee = catchAsync(async (req, res) => {
  if (!canManage(req.user) && String(req.params.employeeId) !== String(req.user._id)) throw new ApiError(httpStatus.FORBIDDEN, 'Employees may only view their own overtime');
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await overtimeManagementService.getOvertimeByEmployee(req.params.employeeId, options);
  res.send(result);
});

const updateOvertime = catchAsync(async (req, res) => {
  const existing = await overtimeManagementService.getOvertimeById(req.params.overtimeId);
  if (!existing) throw new ApiError(httpStatus.NOT_FOUND, 'Overtime request not found');
  if (!canManage(req.user) && String(existing.employee?._id) !== String(req.user._id)) throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  const overtime = await overtimeManagementService.updateOvertimeById(req.params.overtimeId, req.body);
  res.send(overtime);
});

const updateOvertimeStatus = catchAsync(async (req, res) => {
  const overtime = await overtimeManagementService.updateOvertimeStatus(req.params.overtimeId, req.body.status, req.user, req.body);
  res.send(overtime);
});

const deleteOvertime = catchAsync(async (req, res) => {
  const existing = await overtimeManagementService.getOvertimeById(req.params.overtimeId);
  if (!existing) throw new ApiError(httpStatus.NOT_FOUND, 'Overtime request not found');
  if (!canManage(req.user) && String(existing.employee?._id) !== String(req.user._id)) throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  await overtimeManagementService.deleteOvertimeById(req.params.overtimeId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  getQuickStats,
  approveAll,
  createOvertime,
  getOvertime,
  getOvertimeById,
  getOvertimeByEmployee,
  updateOvertime,
  updateOvertimeStatus,
  deleteOvertime,
};
