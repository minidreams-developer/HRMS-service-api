const httpStatus = require('http-status');
const { SalaryDetails } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create salary details
 * @param {Object} body
 * @returns {Promise<SalaryDetails>}
 */
const createSalaryDetails = async (body) => {
  return SalaryDetails.create(body);
};

/**
 * Query for salary details
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const querySalaryDetails = async (filter, options) => {
  const salaryDetails = await SalaryDetails.paginate(filter, options);
  return salaryDetails;
};

/**
 * Get salary details by id
 * @param {ObjectId} id
 * @returns {Promise<SalaryDetails>}
 */
const getSalaryDetailsById = async (id) => {
  return SalaryDetails.findById(id);
};

/**
 * Update salary details by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<SalaryDetails>}
 */
const updateSalaryDetailsById = async (id, updateBody) => {
  const salaryDetails = await getSalaryDetailsById(id);
  if (!salaryDetails) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Salary details not found');
  }
  Object.assign(salaryDetails, updateBody);
  await salaryDetails.save();
  return salaryDetails;
};

/**
 * Delete salary details by id
 * @param {ObjectId} id
 * @returns {Promise<SalaryDetails>}
 */
const deleteSalaryDetailsById = async (id) => {
  const salaryDetails = await getSalaryDetailsById(id);
  if (!salaryDetails) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Salary details not found');
  }
  await salaryDetails.remove();
  return salaryDetails;
};

module.exports = {
  createSalaryDetails,
  querySalaryDetails,
  getSalaryDetailsById,
  updateSalaryDetailsById,
  deleteSalaryDetailsById,
};
