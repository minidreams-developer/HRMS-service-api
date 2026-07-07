const httpStatus = require('http-status');
const { Organization, Address } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * If the caller sent an address object (not an ObjectId), create a new Address
 * document and return its _id. Otherwise return the value as-is.
 * @param {Object|string} address
 * @returns {Promise<ObjectId|string>}
 */
const resolveAddress = async (address) => {
  if (address && typeof address === 'object') {
    const created = await Address.create(address);
    return created._id;
  }
  return address; // already an ObjectId string
};

/**
 * If the caller sent an address object, update the existing Address document
 * in-place. If no address document exists yet, create one.
 * @param {ObjectId|null} existingAddressId
 * @param {Object|string} address
 * @returns {Promise<ObjectId>}
 */
const resolveAddressUpdate = async (existingAddressId, address) => {
  if (address && typeof address === 'object') {
    if (existingAddressId) {
      await Address.findByIdAndUpdate(existingAddressId, address, { new: true });
      return existingAddressId;
    }
    const created = await Address.create(address);
    return created._id;
  }
  return address; // caller passed a plain ObjectId
};

/**
 * Create an organization.
 * Accepts address as a nested object { addressLine1, addressLine2, city, state, pincode, country }
 * or as a plain ObjectId string.
 * @param {Object} body
 * @returns {Promise<Organization>}
 */
const createOrganization = async (body) => {
  const data = { ...body };

  if (data.address) {
    data.address = await resolveAddress(data.address);
  }

  const organization = await Organization.create(data);
  return Organization.findById(organization._id).populate('address owner');
};

/**
 * Query for organizations
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryOrganizations = async (filter, options) => {
  const result = await Organization.paginate(filter, {
    ...options,
    populate: 'address owner',
  });
  return result;
};

/**
 * Get organization by id
 * @param {ObjectId} id
 * @returns {Promise<Organization>}
 */
const getOrganizationById = async (id) => {
  return Organization.findById(id).populate('address owner');
};

/**
 * Update organization by id.
 * Accepts address as a nested object or a plain ObjectId string.
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<Organization>}
 */
const updateOrganizationById = async (id, updateBody) => {
  const organization = await Organization.findById(id);
  if (!organization) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Organization not found');
  }

  const data = { ...updateBody };

  if (data.address) {
    data.address = await resolveAddressUpdate(organization.address, data.address);
  }

  const updated = await Organization.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: false }).populate(
    'address owner'
  );

  return updated;
};

/**
 * Delete organization by id
 * @param {ObjectId} id
 * @returns {Promise<Organization>}
 */
const deleteOrganizationById = async (id) => {
  const organization = await Organization.findById(id);
  if (!organization) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Organization not found');
  }
  await organization.remove();
  return organization;
};

module.exports = {
  createOrganization,
  queryOrganizations,
  getOrganizationById,
  updateOrganizationById,
  deleteOrganizationById,
};
