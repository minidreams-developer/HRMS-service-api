const httpStatus = require('http-status');
const seriesConfiguration = require('../models/seriesConfiguration.model');
const ApiError = require('../utils/ApiError');

const createSeriesConfiguration = async (userBody) => {
  const voucherDuplicate = await seriesConfiguration.findOne({ voucherType: userBody.voucherType });
  if (voucherDuplicate) throw new ApiError(httpStatus.BAD_REQUEST, 'Series for voucherType already exists');
  const duplicate = await seriesConfiguration.findOne({
    seriesName: new RegExp(`^${String(userBody.seriesName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
  });
  if (duplicate) throw new ApiError(httpStatus.BAD_REQUEST, 'Series name already exists');
  return seriesConfiguration.create({ ...userBody, currentNumber: userBody.startingNo - 1, hasBeenUsed: false });
};

const allocateNextNumber = async (voucherType) => {
  const config = await seriesConfiguration.findOneAndUpdate(
    { voucherType },
    [{ $set: {
      currentNumber: { $add: [{ $ifNull: ['$currentNumber', { $subtract: ['$startingNo', 1] }] }, 1] },
      hasBeenUsed: true,
    } }],
    { new: true }
  );
  if (!config) return null;
  const number = String(config.currentNumber).padStart(config.lengthOfZero, '0');
  return `${config.prefix}${number}${config.suffix}`;
};

const getAllSeriesConfiguration = async (filter, options) => {
  const query = { ...filter };
  if (query.search !== undefined) {
    const escaped = String(query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    delete query.search;
    query.$or = [
      { seriesName: { $regex: escaped, $options: 'i' } },
      { voucherType: { $regex: escaped, $options: 'i' } },
      { prefix: { $regex: escaped, $options: 'i' } },
      { suffix: { $regex: escaped, $options: 'i' } },
    ];
  }
  return seriesConfiguration.paginate(query, options);
};

const getSeriesConfigurationById = async (id) => {
  return seriesConfiguration.findById(id);
};

const updateSeriesConfigurationById = async (id, updateBody) => {
  const config = await getSeriesConfigurationById(id);
  if (!config) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Series configuration not found');
  }
  if (updateBody.seriesName && updateBody.seriesName.toLowerCase() !== config.seriesName.toLowerCase()) {
    const duplicate = await seriesConfiguration.findOne({
      _id: { $ne: id },
      seriesName: new RegExp(`^${String(updateBody.seriesName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    });
    if (duplicate) throw new ApiError(httpStatus.BAD_REQUEST, 'Series name already exists');
  }
  if (updateBody.voucherType && updateBody.voucherType !== config.voucherType) {
    const duplicate = await seriesConfiguration.findOne({ _id: { $ne: id }, voucherType: updateBody.voucherType });
    if (duplicate) throw new ApiError(httpStatus.BAD_REQUEST, 'Series for voucherType already exists');
  }
  if (config.hasBeenUsed && updateBody.startingNo !== undefined && updateBody.startingNo !== config.startingNo) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'startingNo cannot be changed after the series is used');
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
  if (config.hasBeenUsed) throw new ApiError(httpStatus.CONFLICT, 'Used series configuration cannot be deleted');
  await config.remove();
  return config;
};

module.exports = {
  createSeriesConfiguration,
  getAllSeriesConfiguration,
  getSeriesConfigurationById,
  updateSeriesConfigurationById,
  deleteSeriesConfigurationById,
  allocateNextNumber,
};
