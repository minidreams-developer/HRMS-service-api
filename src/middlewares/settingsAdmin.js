const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

module.exports = (req, res, next) => {
  if (!['admin', 'subAdmin'].includes(req.user?.role)) {
    return next(new ApiError(httpStatus.FORBIDDEN, 'Only admin or subAdmin may manage Settings'));
  }
  return next();
};
