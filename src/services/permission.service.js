const httpStatus = require('http-status');
const { Permission } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a permission
 * @param {Object} body
 * @returns {Promise<Permission>}
 */
const createPermission = async (body) => {
  return Permission.create(body);
};

/**
 * Query for permissions
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryPermissions = async (filter, options) => {
  const permissions = await Permission.paginate(filter, options);
  return permissions;
};

/**
 * Get permission by id
 * @param {ObjectId} id
 * @returns {Promise<Permission>}
 */
const getPermissionById = async (id) => {
  return Permission.findById(id);
};

/**
 * Update permission by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<Permission>}
 */
const updatePermissionById = async (id, updateBody) => {
  const permission = await getPermissionById(id);
  if (!permission) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Permission not found');
  }
  Object.assign(permission, updateBody);
  await permission.save();
  return permission;
};

/**
 * Delete permission by id
 * @param {ObjectId} id
 * @returns {Promise<Permission>}
 */
const deletePermissionById = async (id) => {
  const permission = await getPermissionById(id);
  if (!permission) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Permission not found');
  }
  await permission.remove();
  return permission;
};

module.exports = {
  createPermission,
  queryPermissions,
  getPermissionById,
  updatePermissionById,
  deletePermissionById,
};
