const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

const matchEmbedding = catchAsync(async (req, res) => {
  throw new ApiError(
    httpStatus.NOT_IMPLEMENTED,
    'Face verification is unavailable until an approved liveness-capable provider is configured',
  );
});

module.exports = { matchEmbedding };
