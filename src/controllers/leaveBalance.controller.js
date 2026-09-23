const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { leaveBalanceService } = require('../services');

const managementRoles = new Set(['manager', 'hr_manager', 'subAdmin', 'admin']);
const canManage = (user) => managementRoles.has(user.role);
const ensureSelfOrManager = (req, employeeId) => {
  if (!canManage(req.user) && String(req.user._id) !== String(employeeId)) throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
};

const createBalance = catchAsync(async (req, res) => {
  if (!canManage(req.user)) throw new ApiError(httpStatus.FORBIDDEN, 'Only management may allocate leave balance');
  res.status(httpStatus.CREATED).send(await leaveBalanceService.createBalance(req.body));
});

const updateBalance = catchAsync(async (req, res) => {
  if (!canManage(req.user)) throw new ApiError(httpStatus.FORBIDDEN, 'Only management may update leave balance');
  res.send(await leaveBalanceService.updateBalance(req.params.balanceId, req.body));
});

const getBalancesByEmployee = catchAsync(async (req, res) => {
  ensureSelfOrManager(req, req.params.employeeId);
  res.send(await leaveBalanceService.getBalancesByEmployee(req.params.employeeId, req.query.year));
});

const getBalanceById = catchAsync(async (req, res) => {
  const balance = await leaveBalanceService.getBalanceById(req.params.balanceId);
  ensureSelfOrManager(req, balance.employeeId);
  res.send(balance);
});

module.exports = { createBalance, updateBalance, getBalancesByEmployee, getBalanceById };
