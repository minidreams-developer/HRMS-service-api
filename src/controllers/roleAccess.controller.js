const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { roleAccessService } = require('../services');

/**
 * POST /roles
 * Create a new role. Permissions default to all-false if omitted.
 */
const createRole = catchAsync(async (req, res) => {
  const role = await roleAccessService.createRole(req.body);
  res.status(httpStatus.CREATED).send(role);
});

/**
 * GET /roles
 * List all roles with optional filters and pagination.
 */
const getRoles = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'description', 'search', 'isSystemRole', 'isDefault', 'isActive']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await roleAccessService.queryRoles(filter, options);
  res.send(result);
});

/**
 * GET /roles/:roleId
 * Get a single role by ID.
 */
const getRole = catchAsync(async (req, res) => {
  const role = await roleAccessService.getRoleById(req.params.roleId);
  if (!role) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
  }
  res.send(role);
});

/**
 * PATCH /roles/:roleId
 * Update role metadata (name, description, isActive, etc.).
 */
const updateRole = catchAsync(async (req, res) => {
  const role = await roleAccessService.updateRoleById(req.params.roleId, req.body);
  res.send(role);
});

/**
 * DELETE /roles/:roleId
 * Delete a role. System roles cannot be deleted.
 */
const deleteRole = catchAsync(async (req, res) => {
  await roleAccessService.deleteRoleById(req.params.roleId);
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * GET /roles/:roleId/permissions
 * Get the full grouped permissions structure for a role.
 */
const getRolePermissions = catchAsync(async (req, res) => {
  const permissions = await roleAccessService.getRolePermissions(req.params.roleId);
  res.send({ permissions });
});

/**
 * PATCH /roles/:roleId/permissions
 * Replace the entire grouped permissions array for a role.
 */
const updateRolePermissions = catchAsync(async (req, res) => {
  const role = await roleAccessService.updateRolePermissions(req.params.roleId, req.body.permissions);
  res.send(role);
});

/**
 * PATCH /roles/:roleId/permissions/:group/:module
 * Update a single module's permissions within a group.
 * Body: { enabled?: boolean, permissions?: { view, add, edit, delete } }
 */
const updateModulePermissions = catchAsync(async (req, res) => {
  const { roleId, group, module } = req.params;
  const role = await roleAccessService.updateModulePermissions(roleId, group, module, req.body);
  res.send(role);
});

/**
 * POST /roles/:roleId/permissions/reset
 * Reset all permissions to the default all-false structure.
 */
const resetRolePermissions = catchAsync(async (req, res) => {
  const role = await roleAccessService.resetRolePermissions(req.params.roleId);
  res.send(role);
});

/**
 * POST /roles/:roleId/clone
 * Clone an existing role under a new name.
 */
const cloneRole = catchAsync(async (req, res) => {
  const role = await roleAccessService.cloneRole(req.params.roleId, req.body.newName);
  res.status(httpStatus.CREATED).send(role);
});

module.exports = {
  createRole,
  getRoles,
  getRole,
  updateRole,
  deleteRole,
  getRolePermissions,
  updateRolePermissions,
  updateModulePermissions,
  resetRolePermissions,
  cloneRole,
};
