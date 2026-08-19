const httpStatus = require('http-status');
const { Asset } = require('../models');
const ApiError = require('../utils/ApiError');

const createAsset = async (body) => {
  return Asset.create(body);
};

const queryAssets = async (filter, options = {}) => {
  if (filter.search) {
    const search = filter.search;
    delete filter.search;

    const regex = new RegExp(search, 'i');

    filter.$or = [
      { assetName: regex },
      { assetSerialNumber: regex },
      { assetType: regex },
      { assetDescription: regex },
    ];
  }

  const limit = options.limit ? parseInt(options.limit, 10) : 10;
  const page = options.page ? parseInt(options.page, 10) : 1;
  const skip = (page - 1) * limit;

  let sort = {};
  if (options.sortBy) {
    const parts = options.sortBy.split(':');
    if (parts[0]) {
      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    }
  }

  const [results, totalResults] = await Promise.all([
    Asset.find(filter).populate('assignedTo', 'name employeeId email').sort(sort).skip(skip).limit(limit),
    Asset.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalResults / limit) || 1;

  return {
    results,
    page,
    limit,
    totalPages,
    totalResults,
  };
};

const getAssetById = async (id) => {
  return Asset.findById(id).populate('assignedTo', 'name employeeId email');
};

const updateAsset = async (id, body) => {
  return Asset.findByIdAndUpdate(id, body, { new: true });
};

const deleteAsset = async (id) => {
  return Asset.findByIdAndDelete(id);
};

/**
 * Assign an asset to an employee.
 * @param {ObjectId} assetId
 * @param {ObjectId} employeeId  - the User _id of the employee
 * @param {Date}     issuedDate  - optional date of issue
 * @returns {Promise<Asset>}
 */
const assignAssetToEmployee = async (assetId, employeeId, issuedDate) => {
  const asset = await Asset.findById(assetId);
  if (!asset) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Asset not found');
  }

  asset.assignedTo = employeeId;
  asset.assetStatus = 'currently_using';
  asset.isReturned = false;
  if (issuedDate) asset.issuedDate = issuedDate;

  await asset.save();
  return asset.populate('assignedTo', 'name employeeId email');
};

module.exports = {
  createAsset,
  queryAssets,
  getAssetById,
  updateAsset,
  deleteAsset,
  assignAssetToEmployee,
};
