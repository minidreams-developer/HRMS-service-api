const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { leaderboardService } = require('../services');

const createLeaderboard = catchAsync(async (req, res) => {
  const leaderboard = await leaderboardService.createLeaderboard(req.body);
  res.status(httpStatus.CREATED).send(leaderboard);
});

const getLeaderboards = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['user']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await leaderboardService.queryLeaderboards(filter, options);
  res.send(result);
});

const getLeaderboard = catchAsync(async (req, res) => {
  const leaderboard = await leaderboardService.getLeaderboardById(req.params.leaderboardId);
  if (!leaderboard) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Leaderboard entry not found');
  }
  res.send(leaderboard);
});

const getLeaderboardByUser = catchAsync(async (req, res) => {
  const leaderboard = await leaderboardService.getLeaderboardByUserId(req.params.userId);
  if (!leaderboard) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Leaderboard entry not found for this user');
  }
  res.send(leaderboard);
});

const updateLeaderboard = catchAsync(async (req, res) => {
  const leaderboard = await leaderboardService.updateLeaderboardById(req.params.leaderboardId, req.body);
  res.send(leaderboard);
});

const deleteLeaderboard = catchAsync(async (req, res) => {
  await leaderboardService.deleteLeaderboardById(req.params.leaderboardId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createLeaderboard,
  getLeaderboards,
  getLeaderboard,
  getLeaderboardByUser,
  updateLeaderboard,
  deleteLeaderboard,
};
