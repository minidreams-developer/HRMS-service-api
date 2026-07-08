const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const daySettingService = require('../services/daySetting.service');

/**
 * POST /v1/day-settings
 * Save the global default day timing (main "Save" button).
 * Upserts — only one default ever exists.
 */
const createDefaultDaySetting = catchAsync(async (req, res) => {
  const daySetting = await daySettingService.createDefaultDaySetting(req.body);
  res.status(httpStatus.CREATED).send(daySetting);
});

/**
 * POST /v1/day-settings/single
 * Save a one-off timing override for a specific date ("For one day" flow).
 */
const createSingleDaySetting = catchAsync(async (req, res) => {
  const daySetting = await daySettingService.createSingleDaySetting(req.body);
  res.status(httpStatus.CREATED).send(daySetting);
});

/**
 * GET /v1/day-settings
 * List all day settings. Filter by ?type=default or ?type=single.
 */
const getDaySettings = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['type']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await daySettingService.queryDaySettings(filter, options);
  res.send(result);
});

/**
 * GET /v1/day-settings/default
 * Get the current global default timing.
 */
const getDefaultDaySetting = catchAsync(async (req, res) => {
  const daySetting = await daySettingService.getDefaultDaySetting();
  if (!daySetting) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No default day setting found');
  }
  res.send(daySetting);
});

/**
 * GET /v1/day-settings/:daySettingId
 * Get a single day setting by its _id.
 */
const getDaySetting = catchAsync(async (req, res) => {
  const daySetting = await daySettingService.getDaySettingById(req.params.daySettingId);
  if (!daySetting) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Day setting not found');
  }
  res.send(daySetting);
});

/**
 * PATCH /v1/day-settings/:daySettingId
 * Partial update.
 */
const updateDaySetting = catchAsync(async (req, res) => {
  const daySetting = await daySettingService.updateDaySettingById(req.params.daySettingId, req.body);
  res.send(daySetting);
});

/**
 * DELETE /v1/day-settings/:daySettingId
 * Delete a day setting.
 */
const deleteDaySetting = catchAsync(async (req, res) => {
  await daySettingService.deleteDaySettingById(req.params.daySettingId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createDefaultDaySetting,
  createSingleDaySetting,
  getDaySettings,
  getDefaultDaySetting,
  getDaySetting,
  updateDaySetting,
  deleteDaySetting,
};
