const httpStatus = require('http-status');
const seriesConfiguration = require('../models/seriesConfiguration.model');
const ApiError = require('../utils/ApiError');

const createSeriesConfiguration = async (userBody) => {
  return seriesConfiguration.create(userBody);
};

const getAllSeriesConfiguration = async (filter, options) => {
  return seriesConfiguration.paginate(filter, options);
};

const getSeriesConfigurationById = async (id) => {
  return seriesConfiguration.findById(id);
};

const updateSeriesConfigurationById = async (id, updateBody) => {
  const config = await getSeriesConfigurationById(id);
  if (!config) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Series configuration not found');
  }
  Object.assign(config, updateBody);
  await config.save();
  return config;
};

const deleteSeriesConfigurationById = async (id) => {
  const config = await getSeriesConfigurationById(id);
  if (!config) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Series configuration not found');
  }
  await config.remove();
  return config;
};

module.exports = {
  createSeriesConfiguration,
  getAllSeriesConfiguration,
  getSeriesConfigurationById,
  updateSeriesConfigurationById,
  deleteSeriesConfigurationById,
};