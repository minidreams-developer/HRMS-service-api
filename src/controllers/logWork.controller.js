const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const logWorkService = require('../services/logWork.service');

/**
 * POST /v1/log-work
 * Create a new work log entry for a contractor.
 */
const createLogWork = catchAsync(async (req, res) => {
  const log = await logWorkService.createLogWork(req.body);
  res.status(httpStatus.CREATED).send(log);
});

/**
 * GET /v1/log-work
 * List all work log entries with pagination.
 */
const getLogWorks = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['branch']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await logWorkService.queryLogWork(filter, options);
  res.send(result);
});

/**
 * GET /v1/log-work/contractor/:contractorId
 * Get all work log entries for a specific contractor.
 * Accepts MongoDB _id or employeeId (CTR-XXXXXX).
 */
const getLogsByContractor = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await logWorkService.getLogsByContractor(req.params.contractorId, options);
  res.send(result);
});

/**
 * GET /v1/log-work/:logId
 * Get a single work log entry by its _id.
 */
const getLogWork = catchAsync(async (req, res) => {
  const log = await logWorkService.getLogWorkById(req.params.logId);
  if (!log) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Work log entry not found');
  }
  res.send(log);
});

/**
 * PATCH /v1/log-work/:logId
 * Partially update a work log entry.
 */
const updateLogWork = catchAsync(async (req, res) => {
  const log = await logWorkService.updateLogWorkById(req.params.logId, req.body);
  res.send(log);
});

/**
 * DELETE /v1/log-work/:logId
 * Delete a work log entry.
 */
const deleteLogWork = catchAsync(async (req, res) => {
  await logWorkService.deleteLogWorkById(req.params.logId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createLogWork,
  getLogWorks,
  getLogsByContractor,
  getLogWork,
  updateLogWork,
  deleteLogWork,
};
