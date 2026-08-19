const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { assetService } = require('../services');

const createAsset = catchAsync(async (req, res) => {
  const asset = await assetService.createAsset(req.body);
  res.status(httpStatus.CREATED).send(asset);
});

const getAssets = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['assetName', 'assetSerialNumber', 'assetType', 'search']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await assetService.queryAssets(filter, options);
  res.send(result);
});

const getAsset = catchAsync(async (req, res) => {
  const asset = await assetService.getAssetById(req.params.assetId);
  if (!asset) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Asset not found');
  }
  res.send(asset);
});

const updateAsset = catchAsync(async (req, res) => {
  const asset = await assetService.updateAsset(req.params.assetId, req.body);
  if (!asset) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Asset not found');
  }
  res.send(asset);
});

const deleteAsset = catchAsync(async (req, res) => {
  const asset = await assetService.deleteAsset(req.params.assetId);
  if (!asset) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Asset not found');
  }
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * PATCH /v1/assets/:assetId/assign/:employeeId
 * Assign an asset to a specific employee.
 */
const assignAssetToEmployee = catchAsync(async (req, res) => {
  const { assetId, employeeId } = req.params;
  const { issuedDate } = req.body;
  const asset = await assetService.assignAssetToEmployee(assetId, employeeId, issuedDate);
  res.send(asset);
});

module.exports = {
  createAsset,
  getAssets,
  getAsset,
  updateAsset,
  deleteAsset,
  assignAssetToEmployee,
};
