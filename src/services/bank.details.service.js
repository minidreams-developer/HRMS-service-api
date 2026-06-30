const httpStatus = require('http-status');
const { BankDetails } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a bankDetails
 * @param {Object} body
 * @returns {Promise<BankDetails>}
 */
const createBankDetails = async (body) => {
  return BankDetails.create(body);
};

/**
 * Query for bankDetails
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryBankDetails = async (filter, options) => {
  const bankDetails = await BankDetails.paginate(filter, options);
  return bankDetails;
};

/**
 * Get bankDetails by id
 * @param {ObjectId} id
 * @returns {Promise<BankDetails>}
 */
const getBankDetailsById = async (id) => {
  return BankDetails.findById(id);
};

/**
 * Update bankDetails by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<BankDetails>}
 */
const updateBankDetailsById = async (id, updateBody) => {
  const bankDetails = await getBankDetailsById(id);
  if (!bankDetails) {
    throw new ApiError(httpStatus.NOT_FOUND, 'BankDetails not found');
  }
  Object.assign(bankDetails, updateBody);
  await bankDetails.save();
  return bankDetails;
};

/**
 * Delete bankDetails by id
 * @param {ObjectId} id
 * @returns {Promise<BankDetails>}
 */
const deleteBankDetailsById = async (id) => {
  const bankDetails = await getBankDetailsById(id);
  if (!bankDetails) {
    throw new ApiError(httpStatus.NOT_FOUND, 'BankDetails not found');
  }
  await bankDetails.remove();
  return bankDetails;
};

module.exports = {
  createBankDetails,
  queryBankDetails,
  getBankDetailsById,
  updateBankDetailsById,
  deleteBankDetailsById,
};
