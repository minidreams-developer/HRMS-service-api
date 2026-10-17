const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { Role } = require('../models');

const moduleForRequest = (req) => {
  const base = req.baseUrl || '';
  if (base.endsWith('/roles')) return 'roles';
  if (base.endsWith('/day-settings')) return 'daySettings';
  if (base.endsWith('/organizations')) return 'organizationDetails';
  if (base.endsWith('/seriesConfiguration')) return 'seriesConfiguration';
  return null;
};

const actionForRequest = (req, module) => {
  if (module === 'roles') {
    if (req.path.includes('/permissions/reset')) return 'edit';
    if (req.path.includes('/clone')) return 'add';
    if (req.path.includes('/permissions') && req.method === 'PATCH') return 'edit';
    if (req.path.includes('/permissions') && req.method === 'GET') return 'view';
    if (req.path === '/generate-id') return 'add';
  }
  return ({ GET: 'view', POST: 'add', PATCH: 'edit', PUT: 'edit', DELETE: 'delete' })[req.method];
};

const canGrantPermissions = (actorPermissions, requestedPermissions) => {
  const actor = new Map();
  (actorPermissions || []).forEach((group) => (group.modules || []).forEach((entry) => {
    actor.set(`${group.group}:${entry.module}`, {
      enabled: entry.enabled === true,
      permissions: entry.permissions || {},
    });
  }));
  return (requestedPermissions || []).every((group) => (group.modules || []).every((entry) => {
    const authority = actor.get(`${group.group}:${entry.module}`);
    if (entry.enabled === true && !authority?.enabled) return false;
    return Object.entries(entry.permissions || {}).every(([permission, enabled]) => (
      enabled !== true || authority?.enabled === true && authority.permissions?.[permission] === true
    ));
  }));
};

const requestedPermissionsFor = async (req) => {
  if (req.baseUrl?.endsWith('/roles')) {
    if (Array.isArray(req.body?.permissions)) return req.body.permissions;
    if (req.path.includes('/permissions/') && req.body?.permissions) {
      const [group, module] = req.path.split('/permissions/')[1].split('/');
      return [{ group, modules: [{ module, enabled: req.body.enabled, permissions: req.body.permissions }] }];
    }
    if (req.path.includes('/clone') && req.params.roleId) {
      const source = await Role.findById(req.params.roleId).select('permissions').lean();
      return source?.permissions || [];
    }
  }
  return null;
};

module.exports = async (req, res, next) => {
  try {
    if (['admin', 'subAdmin'].includes(req.user?.role)) return next();

    const module = moduleForRequest(req);
    const action = actionForRequest(req, module);
    if (!module || !action || !req.user?.roleId) {
      return next(new ApiError(httpStatus.FORBIDDEN, 'Insufficient Settings permission'));
    }

    const role = await Role.findOne({ _id: req.user.roleId, isActive: true }).select('permissions').lean();
    const group = role?.permissions?.find((entry) => entry.group === 'settings');
    const permissionModule = group?.modules?.find((entry) => entry.module === module);
    if (!permissionModule?.enabled || permissionModule.permissions?.[action] !== true) {
      return next(new ApiError(httpStatus.FORBIDDEN, 'Insufficient Settings permission'));
    }
    const requestedPermissions = await requestedPermissionsFor(req);
    if (requestedPermissions && !canGrantPermissions(role.permissions, requestedPermissions)) {
      return next(new ApiError(httpStatus.FORBIDDEN, 'Cannot grant permissions beyond your authority'));
    }
    return next();
  } catch (error) {
    return next(error);
  }
};
