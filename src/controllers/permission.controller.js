const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { permissionService } = require('../services');
const managementRoles = new Set(['manager', 'hr_manager', 'subAdmin', 'admin']);

const createPermission = catchAsync(async (req, res) => {
  if (!managementRoles.has(req.user.role) && String(req.body.user) !== String(req.user._id)) throw new ApiError(httpStatus.FORBIDDEN, 'Employees may only create their own permission requests');
  const permission = await permissionService.createPermission(req.body);
  res.status(httpStatus.CREATED).send(permission);
});

const getPermissions = catchAsync(async (req, res) => {
  if (!managementRoles.has(req.user.role)) req.query.user = req.user._id;
  const filter = pick(req.query, ['user', 'permissionStatus', 'date']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await permissionService.queryPermissions(filter, options);
  res.send(result);
});

const getPermission = catchAsync(async (req, res) => {
  const permission = await permissionService.getPermissionById(req.params.permissionId);
  if (!permission) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Permission not found');
  }
  if (!managementRoles.has(req.user.role) && String(permission.user) !== String(req.user._id)) throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  res.send(permission);
});

const updatePermission = catchAsync(async (req, res) => {
  const existing = await permissionService.getPermissionById(req.params.permissionId);
  if (!existing) throw new ApiError(httpStatus.NOT_FOUND, 'Permission not found');
  if (!managementRoles.has(req.user.role)) throw new ApiError(httpStatus.FORBIDDEN, 'Only management may update permission status');
  const body = { ...req.body };
  if (body.permissionStatus === 'approved') { body.approvedBy = req.user._id; body.approvedAt = new Date(); }
  if (body.permissionStatus === 'rejected') { body.rejectedBy = req.user._id; body.rejectedAt = new Date(); }
  if (body.permissionStatus === 'cancelled') { body.cancelledBy = req.user._id; body.cancelledAt = new Date(); }
  const permission = await permissionService.updatePermissionById(req.params.permissionId, body);
  res.send(permission);
});

const deletePermission = catchAsync(async (req, res) => {
  const existing = await permissionService.getPermissionById(req.params.permissionId);
  if (!existing) throw new ApiError(httpStatus.NOT_FOUND, 'Permission not found');
  if (!managementRoles.has(req.user.role) && String(existing.user) !== String(req.user._id)) throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  await permissionService.deletePermissionById(req.params.permissionId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createPermission,
  getPermissions,
  getPermission,
  updatePermission,
  deletePermission,
};
