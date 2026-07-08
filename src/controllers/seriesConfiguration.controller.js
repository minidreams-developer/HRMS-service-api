const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const seriesConfigurationService = require('../services/seriesConfiguration.service');

const createSeriesConfiguration = catchAsync(async (req, res) => {
  const data = await seriesConfigurationService.createSeriesConfiguration(req.body);
  res.status(httpStatus.CREATED).send(data);
});

const getAllSeriesConfiguration = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['seriesName', 'voucherType']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await seriesConfigurationService.getAllSeriesConfiguration(filter, options);
  res.send(result);
});

const getSeriesConfigurationById = catchAsync(async (req, res) => {
  const data = await seriesConfigurationService.getSeriesConfigurationById(req.params.seriesId);
  if (!data) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Series configuration not found');
  }
  res.send(data);
});

const updateSeriesConfiguration = catchAsync(async (req, res) => {
  const data = await seriesConfigurationService.updateSeriesConfigurationById(req.params.seriesId, req.body);
  res.send(data);
});

const deleteSeriesConfiguration = catchAsync(async (req, res) => {
  await seriesConfigurationService.deleteSeriesConfigurationById(req.params.seriesId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createSeriesConfiguration,
  getAllSeriesConfiguration,
  getSeriesConfigurationById,
  updateSeriesConfiguration,
  deleteSeriesConfiguration,
};