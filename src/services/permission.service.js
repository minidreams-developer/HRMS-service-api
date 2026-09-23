const httpStatus = require('http-status');
const { Permission, User, LeaveRequests } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a permission
 * @param {Object} body
 * @returns {Promise<Permission>}
 */
const managementRoles = new Set(['manager', 'hr_manager', 'subAdmin', 'admin']);
const isManagement = (user) => managementRoles.has(user.role);
const dayRange = (date) => {
  const start = new Date(date); start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

const createPermission = async (body) => {
  const employee = await User.findById(body.user).lean();
  if (!employee) throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  const from = new Date(body.from); const to = new Date(body.to);
  if (!(from < to)) throw new ApiError(httpStatus.BAD_REQUEST, 'from must be earlier than to');
  const date = body.date || from;
  const { start, end } = dayRange(date);
  const active = await Permission.findOne({ user: body.user, date: { $gte: start, $lt: end }, permissionStatus: { $in: ['pending', 'approved'] }, from: { $lt: to }, to: { $gt: from } });
  if (active) throw new ApiError(httpStatus.CONFLICT, 'Permission time overlaps an existing active request');
  const fullDay = await LeaveRequests.findOne({ employeeId: body.user, status: 'approved', leaveDuration: 'fullDay', $or: [{ singleDate: { $gte: start, $lt: end } }, { startDate: { $lte: end }, endDate: { $gte: start } }] }).lean();
  if (fullDay) throw new ApiError(httpStatus.CONFLICT, 'Permission cannot be requested during approved full-day leave');
  return Permission.create({ ...body, date, totalHours: (to - from) / 3600000 });
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
  if (updateBody.permissionStatus && permission.permissionStatus !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Only pending permission requests may change status');
  }
  if (updateBody.from || updateBody.to) {
    const from = new Date(updateBody.from || permission.from); const to = new Date(updateBody.to || permission.to);
    if (!(from < to)) throw new ApiError(httpStatus.BAD_REQUEST, 'from must be earlier than to');
    updateBody.totalHours = (to - from) / 3600000;
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
  isManagement,
};
