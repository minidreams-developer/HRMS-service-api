const httpStatus = require('http-status');
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
 * Query for leaderboard entries
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryLeaderboards = async (filter, options) => {
  options.populate = 'user';
  const leaderboards = await Leaderboard.paginate(filter, options);
  return leaderboards;
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
