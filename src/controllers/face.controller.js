const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { findMatchingPerson } = require('../services/face.service');

const matchEmbedding = catchAsync(async (req, res) => {
  const { embedding } = req.body;
  if (!Array.isArray(embedding) || embedding.length === 0 || embedding.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'embedding must be a non-empty array of numbers');
  }

  const match = await findMatchingPerson(embedding);
  if (!match) return res.send({ success: true, matched: false, person: null, message: 'No matching person found' });
  return res.send({ success: true, matched: true, ...match });
});

module.exports = { matchEmbedding };
