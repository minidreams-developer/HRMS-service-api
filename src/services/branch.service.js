const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { Branch } = require('../models');
const ApiError = require('../utils/ApiError');
const { generateBranchId } = require('../utils/employeeId');
const { setPending, getPending, clearPending } = require('../utils/pendingCode');

const BRANCH_CODE_KEY = 'branchNumber';

const isValidObjectId = (val) =>
  mongoose.Types.ObjectId.isValid(val) && String(new mongoose.Types.ObjectId(val)) === String(val);

/**
 * Create a branch — clears the pending branchNumber once saved
 * @param {Object} body
 * @returns {Promise<Branch>}
 */
const createBranch = async (body) => {
  if (body.branchNumber && await Branch.exists({ branchNumber: body.branchNumber })) throw new ApiError(httpStatus.CONFLICT, 'Branch number already exists');
  if (body.branchName && await Branch.exists({ branchName: { $regex: `^${String(body.branchName).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}$`, $options: 'i' }, branchStatus: 'active' })) throw new ApiError(httpStatus.CONFLICT, 'Branch name already exists');
  const branch = await Branch.create(body);
  if (body.departmentId) await Branch.updateOne({ _id: branch._id }, { $addToSet: { departments: body.departmentId } });
  if (body.branchNumber && body.branchNumber === getPending(BRANCH_CODE_KEY)) {
    clearPending(BRANCH_CODE_KEY);
  }
  return branch;
};

/**
 * Query for branches with search and filter support.
 *
 * Filter keys:
 *   search       — case-insensitive regex across branchName, branchNumber, city, state
 *   branchName   — partial case-insensitive match
 *   branchNumber — exact match
 *   branchStatus — 'active' | 'inactive'
 *   branchType   — partial case-insensitive match
 *   city         — partial case-insensitive match
 *   state        — partial case-insensitive match
 *
 * @param {Object} filter
 * @param {Object} options - sortBy, limit, page
 * @returns {Promise<QueryResult>}
 */
const queryBranches = async (filter, options) => {
  const mongoFilter = {};

  // Free-text search across key fields
  if (filter.search) {
    const regex = { $regex: filter.search, $options: 'i' };
    mongoFilter.$or = [
      { branchName:   regex },
      { branchNumber: regex },
      { city:         regex },
      { state:        regex },
    ];
  }

  // Individual field filters (only when search is not active)
  if (!filter.search) {
    if (filter.branchName) {
      mongoFilter.branchName = { $regex: filter.branchName, $options: 'i' };
    }
    if (filter.branchNumber) {
      mongoFilter.branchNumber = filter.branchNumber;
    }
    if (filter.city) {
      mongoFilter.city = { $regex: filter.city, $options: 'i' };
    }
    if (filter.state) {
      mongoFilter.state = { $regex: filter.state, $options: 'i' };
    }
  }

  if (filter.branchStatus) mongoFilter.branchStatus = filter.branchStatus;
  if (filter.branchType)   mongoFilter.branchType   = { $regex: filter.branchType, $options: 'i' };

  const result = await Branch.paginate(mongoFilter, options);

  // Only populate branchHead where value is a valid ObjectId
  const toPopulate = result.results.filter((b) => isValidObjectId(b.branchHead));
  if (toPopulate.length) {
    await Branch.populate(toPopulate, { path: 'branchHead', select: 'name' });
  }
  return result;
};

/**
 * Get branch by id
 * @param {ObjectId} id
 * @returns {Promise<Branch>}
 */
const getBranchById = async (id) => {
  const branch = await Branch.findById(id);
  if (!branch) return null;
  if (isValidObjectId(branch.branchHead)) {
    await Branch.populate(branch, { path: 'branchHead', select: 'name' });
  }
  return branch;
};

/**
 * Update branch by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<Branch>}
 */
const updateBranchById = async (id, updateBody) => {
  const branch = await getBranchById(id);
  if (!branch) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Branch not found');
  }
  if (updateBody.branchNumber && await Branch.exists({ branchNumber: updateBody.branchNumber, _id: { $ne: id } })) throw new ApiError(httpStatus.CONFLICT, 'Branch number already exists');
  Object.assign(branch, updateBody);
  await branch.save();
  return branch;
};

/**
 * Delete branch by id
 * @param {ObjectId} id
 * @returns {Promise<Branch>}
 */
const deleteBranchById = async (id) => {
  const branch = await getBranchById(id);
  if (!branch) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Branch not found');
  }
  branch.branchStatus = 'inactive';
  branch.deactivatedAt = new Date();
  await branch.save();
  return branch;
};

/**
 * Generate a unique branchNumber not already in the database.
 * Blocks if a previously generated code has not been saved yet.
 * @returns {Promise<string>}
 */
const generateUniqueBranchId = async () => {
  const pending = getPending(BRANCH_CODE_KEY);

  if (pending) {
    const savedInDb = await Branch.exists({ branchNumber: pending });
    if (savedInDb) {
      clearPending(BRANCH_CODE_KEY);
    } else {
      return pending;
    }
  }

  let branchNumber;
  let exists = true;
  while (exists) {
    branchNumber = generateBranchId();
    // eslint-disable-next-line no-await-in-loop
    exists = await Branch.exists({ branchNumber });
  }

  setPending(BRANCH_CODE_KEY, branchNumber);
  return branchNumber;
};

/**
 * Get a lightweight list of active branches for dropdown use.
 * Returns only _id and branchName.
 * @returns {Promise<Array<{_id: ObjectId, branchName: string}>>}
 */
const getBranchDropdown = async () => {
  return Branch.find({ branchStatus: 'active' }, { _id: 1, branchName: 1 }).lean();
};

module.exports = {
  createBranch,
  queryBranches,
  getBranchById,
  updateBranchById,
  deleteBranchById,
  generateUniqueBranchId,
  getBranchDropdown,
};
