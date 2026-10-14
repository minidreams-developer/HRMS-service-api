const httpStatus = require('http-status');
const crypto = require('crypto');
const { Role } = require('../models');
const RoleIdReservation = require('../models/roleIdReservation.model');
const { buildDefaultPermissions } = require('../models/roleAccess.model');
const ApiError = require('../utils/ApiError');
const { allocateNextNumber } = require('./seriesConfiguration.service');

const ROLE_RESERVATION_MINUTES = 20;

const hashReservationToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const generateRoleIdReservation = async (reservedBy) => {
  const roleId = await allocateNextNumber('role');
  if (!roleId) throw new ApiError(httpStatus.BAD_REQUEST, 'Role Series Configuration is not configured');
  const reservationToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ROLE_RESERVATION_MINUTES * 60 * 1000);
  await RoleIdReservation.create({ roleId, reservationTokenHash: hashReservationToken(reservationToken), reservedBy, expiresAt });
  return { roleId, reservationToken, expiresAt };
};

/**
 * Create a role.
 * Permissions default to all-false if not provided.
 * @param {Object} roleBody
 * @returns {Promise<Role>}
 */
const createRole = async (roleBody, reservedBy) => {
  if (roleBody.roleId !== undefined) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'roleId is generated automatically');
  }
  const exists = await Role.findOne({ name: roleBody.name });
  if (exists) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Role name already exists');
  }
  let roleId;
  let reservation;
  if (roleBody.reservationToken) {
    reservation = await RoleIdReservation.findOne({
      reservationTokenHash: hashReservationToken(roleBody.reservationToken),
      reservedBy,
      status: 'reserved',
    });
    if (!reservation) throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid, expired, or already used reservationToken');
    if (reservation.expiresAt <= new Date()) {
      await RoleIdReservation.updateOne({ _id: reservation._id }, { $set: { status: 'expired' } });
      throw new ApiError(httpStatus.BAD_REQUEST, 'Role ID reservation has expired');
    }
    roleId = reservation.roleId;
  } else {
    roleId = await allocateNextNumber('role');
    if (!roleId) throw new ApiError(httpStatus.BAD_REQUEST, 'Role Series Configuration is not configured');
  }
  const { reservationToken, ...roleData } = roleBody;
  const role = await Role.create({ ...roleData, roleId });
  if (reservation) await RoleIdReservation.updateOne({ _id: reservation._id, status: 'reserved' }, { $set: { status: 'consumed', consumedAt: new Date() } });
  return role;
};

/**
 * Query roles with pagination and filtering.
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Pagination options (sortBy, limit, page)
 * @returns {Promise<QueryResult>}
 */
const queryRoles = async (filter, options) => {
  const query = { ...filter };
  if (query.search) {
    const pattern = { $regex: query.search, $options: 'i' };
    delete query.search;
    query.$or = [{ name: pattern }, { description: pattern }, { roleId: pattern }];
  }
  const result = await Role.paginate(query, options);
  await Role.populate(result.results, { path: 'user', select: 'name email employeeId' });
  return result;
};

/**
 * Get a single role by id.
 * @param {ObjectId} id
 * @returns {Promise<Role>}
 */
const getRoleById = async (id) => {
  return Role.findById(id).populate('user', 'name email employeeId');
};

/**
 * Get a single role by name.
 * @param {string} name
 * @returns {Promise<Role>}
 */
const getRoleByName = async (name) => {
  return Role.findOne({ name });
};

/**
 * Update role metadata (name, description, isActive, etc.).
 * Does not allow changing isSystemRole on a system role.
 * @param {ObjectId} roleId
 * @param {Object} updateBody
 * @returns {Promise<Role>}
 */
const updateRoleById = async (roleId, updateBody) => {
  const role = await getRoleById(roleId);
  if (!role) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
  }

  if (updateBody.isSystemRole !== undefined && updateBody.isSystemRole !== role.isSystemRole) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot change system role status');
  }
  if (updateBody.roleId !== undefined && updateBody.roleId !== role.roleId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'roleId cannot be changed');
  }

  if (updateBody.name && updateBody.name !== role.name) {
    const nameExists = await Role.findOne({ name: updateBody.name });
    if (nameExists) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Role name already exists');
    }
  }

  Object.assign(role, updateBody);
  await role.save();
  return role;
};

/**
 * Delete a role by id. System roles cannot be deleted.
 * @param {ObjectId} roleId
 * @returns {Promise<Role>}
 */
const deleteRoleById = async (roleId) => {
  const role = await getRoleById(roleId);
  if (!role) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
  }

  if (role.isSystemRole) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot delete a system role');
  }

  role.isActive = false;
  await role.save();
  return role;
};

/**
 * Get the full grouped permissions array for a role.
 * @param {ObjectId} roleId
 * @returns {Promise<Array>}
 */
const getRolePermissions = async (roleId) => {
  const role = await getRoleById(roleId);
  if (!role) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
  }
  return role.permissions;
};

/**
 * Replace the entire permissions array for a role.
 * Accepts the full grouped structure: [{ group, modules: [{ module, enabled, permissions }] }]
 * @param {ObjectId} roleId
 * @param {Array} permissions
 * @returns {Promise<Role>}
 */
const updateRolePermissions = async (roleId, permissions) => {
  const role = await getRoleById(roleId);
  if (!role) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
  }

  role.permissions = permissions;
  await role.save();
  return role;
};

/**
 * Update a single module's permissions inside a specific group.
 * Only the provided module fields are merged; other modules are untouched.
 * @param {ObjectId} roleId
 * @param {string} group   - e.g. 'peopleHub'
 * @param {string} module  - e.g. 'employees'
 * @param {Object} payload - { enabled?, permissions?: { view?, add?, edit?, delete? } }
 * @returns {Promise<Role>}
 */
const updateModulePermissions = async (roleId, group, module, payload) => {
  const role = await getRoleById(roleId);
  if (!role) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
  }

  const groupEntry = role.permissions.find((g) => g.group === group);
  if (!groupEntry) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Group '${group}' not found in permissions`);
  }

  const moduleEntry = groupEntry.modules.find((m) => m.module === module);
  if (!moduleEntry) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Module '${module}' not found in group '${group}'`);
  }

  if (typeof payload.enabled === 'boolean') {
    moduleEntry.enabled = payload.enabled;
  }

  if (payload.permissions) {
    Object.assign(moduleEntry.permissions, payload.permissions);
  }

  // Mark the nested array as modified so Mongoose picks up the change
  role.markModified('permissions');
  await role.save();
  return role;
};

/**
 * Reset a role's permissions back to the all-false default structure.
 * @param {ObjectId} roleId
 * @returns {Promise<Role>}
 */
const resetRolePermissions = async (roleId) => {
  const role = await getRoleById(roleId);
  if (!role) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
  }

  role.permissions = buildDefaultPermissions();
  await role.save();
  return role;
};

/**
 * Clone an existing role under a new name.
 * The clone copies the source role's permissions exactly.
 * @param {ObjectId} roleId
 * @param {string} newName
 * @returns {Promise<Role>}
 */
const cloneRole = async (roleId, newName) => {
  const source = await getRoleById(roleId);
  if (!source) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
  }

  const nameExists = await Role.findOne({ name: newName });
  if (nameExists) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Role name already exists');
  }

  const clone = await Role.create({
    name: newName,
    description: `Cloned from ${source.name}`,
    isSystemRole: false,
    isDefault: false,
    isActive: true,
    permissions: source.permissions,
    roleId: await allocateNextNumber('role'),
  });

  return clone;
};

module.exports = {
  generateRoleIdReservation,
  createRole,
  queryRoles,
  getRoleById,
  getRoleByName,
  updateRoleById,
  deleteRoleById,
  getRolePermissions,
  updateRolePermissions,
  updateModulePermissions,
  resetRolePermissions,
  cloneRole,
};
