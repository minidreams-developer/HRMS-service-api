const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { teamService } = require('../services');

const createTeam = catchAsync(async (req, res) => {
  const team = await teamService.createTeam(req.body);
  res.status(httpStatus.CREATED).send(team);
});

const getTeams = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['teamName', 'teamCode']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await teamService.queryTeams(filter, options);
  res.send(result);
});

const getTeam = catchAsync(async (req, res) => {
  const team = await teamService.getTeamById(req.params.teamId);
  if (!team) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team not found');
  }
  res.send(team);
});

const updateTeam = catchAsync(async (req, res) => {
  const team = await teamService.updateTeamById(req.params.teamId, req.body);
  res.send(team);
});

const deleteTeam = catchAsync(async (req, res) => {
  await teamService.deleteTeamById(req.params.teamId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createTeam,
  getTeams,
  getTeam,
  updateTeam,
  deleteTeam,
};
