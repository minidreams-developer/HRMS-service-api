const httpStatus = require('http-status');
const { Branch } = require('../models');
const ApiError = require('../utils/ApiError');
const { generateBranchId } = require('../utils/employeeId');
const { setPending, getPending, clearPending } = require('../utils/pendingCode');

const BRANCH_CODE_KEY = 'branchNumber';

/**
 * Create a branch — clears the pending branchNumber once saved
 * @param {Object} body
 * @returns {Promise<Branch>}
 */
const createBranch = async (body) => {
  const branch = await Branch.create(body);
  if (body.branchNumber && body.branchNumber === getPending(BRANCH_CODE_KEY)) {
    clearPending(BRANCH_CODE_KEY);
  }
  return branch;
};

/**
 * Query for branches
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const mongoose = require('mongoose');

const isValidObjectId = (val) => mongoose.Types.ObjectId.isValid(val) && String(new mongoose.Types.ObjectId(val)) === String(val);

const queryBranches = async (filter, options) => {
  const result = await Branch.paginate(filter, options);
  // Only populate documents where branchHead is a valid ObjectId
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
  await branch.remove();
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

module.exports = {
  createBranch,
  queryBranches,
  getBranchById,
  updateBranchById,
  deleteBranchById,
  generateUniqueBranchId,
};
