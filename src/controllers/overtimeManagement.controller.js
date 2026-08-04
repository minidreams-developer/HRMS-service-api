const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { overtimeManagementService } = require('../services');

const createOvertime = catchAsync(async (req, res) => {
  const overtime = await overtimeManagementService.createOvertime(req.body);
  res.status(httpStatus.CREATED).send(overtime);
});

const getOvertime = catchAsync(async (req, res) => {
  const filter  = pick(req.query, ['search', 'employeeId', 'status', 'fromDate', 'toDate']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result  = await overtimeManagementService.queryOvertime(filter, options);
  res.send(result);
});

const getOvertimeById = catchAsync(async (req, res) => {
  const overtime = await overtimeManagementService.getOvertimeById(req.params.overtimeId);
  if (!overtime) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Overtime request not found');
  }
  res.send(overtime);
});

const getOvertimeByEmployee = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await overtimeManagementService.getOvertimeByEmployee(req.params.employeeId, options);
  res.send(result);
});

const updateOvertime = catchAsync(async (req, res) => {
  const overtime = await overtimeManagementService.updateOvertimeById(req.params.overtimeId, req.body);
  res.send(overtime);
});

const updateOvertimeStatus = catchAsync(async (req, res) => {
  const overtime = await overtimeManagementService.updateOvertimeStatus(req.params.overtimeId, req.body.status);
  res.send(overtime);
});

const deleteOvertime = catchAsync(async (req, res) => {
  await overtimeManagementService.deleteOvertimeById(req.params.overtimeId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createOvertime,
  getOvertime,
  getOvertimeById,
  getOvertimeByEmployee,
  updateOvertime,
  updateOvertimeStatus,
  deleteOvertime,
};
