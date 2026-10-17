const passport = require('passport');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { roleRights } = require('../config/roles');
const dynamicPermissions = require('../config/dynamicPermissions');
const { Role } = require('../models');

const permissionGroupAliases = {
  standalone: ['standalone'],
  dashboard: ['dashboard'],
  announcement: ['announcement'],
};

const groupMatches = (storedGroup, requestedGroup, requestedModule) => {
  if (storedGroup === requestedGroup) return true;
  if (requestedGroup === 'standalone' && permissionGroupAliases[requestedModule]?.includes(storedGroup)) return true;
  return false;
};

const hasDynamicPermission = async (user, requiredRight) => {
  const configured = typeof requiredRight === 'string' ? dynamicPermissions[requiredRight] : requiredRight;
  const mapping = configured && !configured.action && !configured.actions
    ? { ...configured, action: ({ GET: 'view', POST: 'add', PUT: 'edit', PATCH: 'edit', DELETE: 'delete' })[configured.requestMethod] }
    : configured;
  if (!mapping || !user.roleId) return false;
  const role = await Role.findOne({ _id: user.roleId, isActive: true }).select('permissions').lean();
  const module = (role?.permissions || [])
    .filter((item) => groupMatches(item.group, mapping.group, mapping.module))
    .flatMap((item) => item.modules || [])
    .find((item) => item.module === mapping.module);
  if (!module || module.enabled === false) return false;
  if (mapping.action) return module.permissions?.[mapping.action] === true;
  return mapping.actions.some((action) => module.permissions?.[action] === true);
};

const verifyCallback = (req, resolve, reject, requiredRights, dynamicContext) => async (err, user, info) => {
  if (err || info || !user) {
    return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
  }
  req.user = user;

  if (requiredRights.length || dynamicContext) {
    const userRights = roleRights.get(user.role) || [];
    const hasRequiredRights = requiredRights.length > 0
      ? await Promise.all(requiredRights.map(async (requiredRight) => (
        userRights.includes(requiredRight) || hasDynamicPermission(user, requiredRight)
      ))).then((results) => results.every(Boolean))
      : false;
    const hasContextPermission = ['admin', 'subAdmin'].includes(user.role)
      || (dynamicContext
        ? await hasDynamicPermission(user, { ...dynamicContext, requestMethod: req.method })
        : false);
    if (!hasRequiredRights && !hasContextPermission && req.params.userId !== user.id) {
      return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
    }
  }

  resolve();
};

const auth = (...args) => async (req, res, next) => {
  const dynamicContext = args.find((arg) => arg && typeof arg === 'object');
  const requiredRights = args.filter((arg) => typeof arg === 'string');
  return new Promise((resolve, reject) => {
    passport.authenticate('jwt', { session: false }, verifyCallback(req, resolve, reject, requiredRights, dynamicContext))(req, res, next);
  })
    .then(() => next())
    .catch((err) => next(err));
};

module.exports = auth;
