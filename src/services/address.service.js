const httpStatus = require('http-status');
const { Address } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a address
 * @param {Object} body
 * @returns {Promise<Address>}
 */
const createAddress = async (body) => {
  return Address.create(body);
};

/**
 * Query for addresses
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryAddresses = async (filter, options) => {
  const addresses = await Address.paginate(filter, options);
  return addresses;
};

/**
 * Get address by id
 * @param {ObjectId} id
 * @returns {Promise<Address>}
 */
const getAddressById = async (id) => {
  return Address.findById(id);
};

/**
 * Update address by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<Address>}
 */
const updateAddressById = async (id, updateBody) => {
  const address = await getAddressById(id);
  if (!address) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Address not found');
  }
  Object.assign(address, updateBody);
  await address.save();
  return address;
};

/**
 * Delete address by id
 * @param {ObjectId} id
 * @returns {Promise<Address>}
 */
const deleteAddressById = async (id) => {
  const address = await getAddressById(id);
  if (!address) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Address not found');
  }
  await address.remove();
  return address;
};

module.exports = {
  createAddress,
  queryAddresses,
  getAddressById,
  updateAddressById,
  deleteAddressById,
};
