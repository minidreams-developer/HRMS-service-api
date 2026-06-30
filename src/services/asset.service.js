const { Asset } = require('../models');

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
    Asset.find(filter).sort(sort).skip(skip).limit(limit),
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
  return Asset.findById(id);
};

const updateAsset = async (id, body) => {
  return Asset.findByIdAndUpdate(id, body, { new: true });
};

const deleteAsset = async (id) => {
  return Asset.findByIdAndDelete(id);
};

module.exports = {
  createAsset,
  queryAssets,
  getAssetById,
  updateAsset,
  deleteAsset,
};
