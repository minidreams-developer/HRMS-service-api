const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { Leaderboard } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create leaderboard entry
 * @param {Object} body
 * @returns {Promise<Leaderboard>}
 */
const createLeaderboard = async (body) => {
  return Leaderboard.create(body);
};

/**
 * Query for leaderboard entries with search support.
 *
 * Filter keys:
 *   search — regex across linked user's name, email, employeeId
 *   user   — exact ObjectId match on the user field
 *
 * @param {Object} filter
 * @param {Object} options - sortBy, limit, page
 * @returns {Promise<QueryResult>}
 */
const queryLeaderboards = async (filter, options) => {
  const { User } = require('../models');
  const mongoFilter = {};

  // Search — resolve matching user IDs first
  if (filter.search) {
    const regex = { $regex: filter.search, $options: 'i' };
    const matchedUsers = await User.find(
      { $or: [{ name: regex }, { email: regex }, { employeeId: regex }] },
      { _id: 1 }
    ).lean();
    const userIds = matchedUsers.map((u) => u._id);
    mongoFilter.user = { $in: userIds };
  }

  // Direct user filter
  if (filter.user && !filter.search) {
    mongoFilter.user = filter.user;
  }

  const paginateOptions = { ...options, populate: 'user' };
  return Leaderboard.paginate(mongoFilter, paginateOptions);
};

/**
 * Get leaderboard by id
 * @param {ObjectId} id
 * @returns {Promise<Leaderboard>}
 */
const getLeaderboardById = async (id) => {
  return Leaderboard.findById(id).populate('user');
};

/**
 * Get leaderboard by user id
 * @param {ObjectId} userId
 * @returns {Promise<Leaderboard>}
 */
const getLeaderboardByUserId = async (userId) => {
  return Leaderboard.findOne({ user: userId }).populate('user');
};

/**
 * Update leaderboard by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<Leaderboard>}
 */
const updateLeaderboardById = async (id, updateBody) => {
  const leaderboard = await getLeaderboardById(id);
  if (!leaderboard) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Leaderboard entry not found');
  }
  Object.assign(leaderboard, updateBody);
  await leaderboard.save();
  return leaderboard;
};

/**
 * Delete leaderboard by id
 * @param {ObjectId} id
 * @returns {Promise<Leaderboard>}
 */
const deleteLeaderboardById = async (id) => {
  const leaderboard = await getLeaderboardById(id);
  if (!leaderboard) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Leaderboard entry not found');
  }
  await leaderboard.remove();
  return leaderboard;
};

module.exports = {
  createLeaderboard,
  queryLeaderboards,
  getLeaderboardById,
  getLeaderboardByUserId,
  updateLeaderboardById,
  deleteLeaderboardById,
};
