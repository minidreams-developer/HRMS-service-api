const passport = require('passport');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { roleRights } = require('../config/roles');
const dynamicPermissions = require('../config/dynamicPermissions');
const { Role } = require('../models');

const hasDynamicPermission = async (user, requiredRight) => {
  const mapping = typeof requiredRight === 'string' ? dynamicPermissions[requiredRight] : requiredRight;
  if (!mapping || !user.roleId) return false;
  const role = await Role.findOne({ _id: user.roleId, isActive: true }).select('permissions').lean();
  const group = role?.permissions?.find((item) => item.group === mapping.group);
  const module = group?.modules?.find((item) => item.module === mapping.module);
  if (!module || module.enabled === false) return false;
  if (mapping.action) return module.permissions?.[mapping.action] === true;
  return mapping.actions.some((action) => module.permissions?.[action] === true);
};

const verifyCallback = (req, resolve, reject, requiredRights, dynamicContext) => async (err, user, info) => {
  if (err || info || !user) {
    return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
  }
  req.user = user;

  if (requiredRights.length) {
    const userRights = roleRights.get(user.role) || [];
    const hasRequiredRights = await Promise.all(requiredRights.map(async (requiredRight) => (
      userRights.includes(requiredRight) || hasDynamicPermission(user, requiredRight)
    ))).then((results) => results.every(Boolean));
    const hasContextPermission = dynamicContext
      ? await hasDynamicPermission(user, dynamicContext)
      : false;
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
