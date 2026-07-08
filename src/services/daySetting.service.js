const httpStatus = require('http-status');
const DaySetting = require('../models/daySetting.model');
const ApiError = require('../utils/ApiError');

// ─── Create default day setting ───────────────────────────────────────────────

/**
 * Save the global default day start/end times for all employees.
 * Triggered by the main "Save" button on the Day Settings screen.
 * Replaces the existing default if one exists.
 *
 * @param {Object} body  { startTime, endTime }
 * @returns {Promise<DaySetting>}
 */
const createDefaultDaySetting = async (body) => {
  // Only one global default should exist — upsert it
  const existing = await DaySetting.findOne({ type: 'default' });
  if (existing) {
    existing.startTime = body.startTime;
    existing.endTime = body.endTime;
    await existing.save();
    return existing;
  }
  return DaySetting.create({
    type: 'default',
    startTime: body.startTime,
    endTime: body.endTime,
  });
};

// ─── Create single-date override ──────────────────────────────────────────────

/**
 * Save a one-off day setting for a specific date.
 * Triggered by "For one day" → date picker → Confirm.
 * Uses the same startTime/endTime from the form, but only for the chosen date.
 *
 * @param {Object} body  { startTime, endTime, date }
 * @returns {Promise<DaySetting>}
 */
const createSingleDaySetting = async (body) => {
  if (!body.date) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'date is required for a single-day setting');
  }
  return DaySetting.create({
    type: 'single',
    startTime: body.startTime,
    endTime: body.endTime,
    date: body.date,
  });
};

// ─── Query ────────────────────────────────────────────────────────────────────

/**
 * List all day settings with optional type filter and pagination.
 * @param {Object} filter   e.g. { type: 'single' }
 * @param {Object} options  { sortBy, limit, page }
 * @returns {Promise<QueryResult>}
 */
const queryDaySettings = async (filter, options) => {
  return DaySetting.paginate(filter, options);
};

// ─── Get by ID ────────────────────────────────────────────────────────────────

/**
 * Get the current global default setting.
 * @returns {Promise<DaySetting|null>}
 */
const getDefaultDaySetting = async () => {
  return DaySetting.findOne({ type: 'default' });
};

/**
 * Get a day setting by its _id.
 * @param {string} id
 * @returns {Promise<DaySetting|null>}
 */
const getDaySettingById = async (id) => {
  return DaySetting.findById(id);
};

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Update a day setting by its _id.
 * @param {string} id
 * @param {Object} updateBody
 * @returns {Promise<DaySetting>}
 */
const updateDaySettingById = async (id, updateBody) => {
  const daySetting = await getDaySettingById(id);
  if (!daySetting) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Day setting not found');
  }
  Object.assign(daySetting, updateBody);
  await daySetting.save();
  return daySetting;
};

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Delete a day setting by its _id.
 * @param {string} id
 * @returns {Promise<DaySetting>}
 */
const deleteDaySettingById = async (id) => {
  const daySetting = await getDaySettingById(id);
  if (!daySetting) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Day setting not found');
  }
  await daySetting.remove();
  return daySetting;
};

module.exports = {
  createDefaultDaySetting,
  createSingleDaySetting,
  queryDaySettings,
  getDefaultDaySetting,
  getDaySettingById,
  updateDaySettingById,
  deleteDaySettingById,
};
