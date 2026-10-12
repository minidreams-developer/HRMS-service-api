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
  const filter = pick(req.query, ['search', 'teamName', 'teamCode', 'teamLead', 'departmentId', 'branchId', 'isActive']);
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

const generateTeamId = catchAsync(async (req, res) => {
  const teamCode = await teamService.generateUniqueTeamId();
  res.send({ teamCode });
});

const addMember = catchAsync(async (req, res) => {
  const team = await teamService.addMemberToTeam(req.params.teamId, req.body.userId);
  res.send(team);
});

const removeMember = catchAsync(async (req, res) => {
  await teamService.removeMemberFromTeam(req.params.teamId, req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createTeam,
  getTeams,
  getTeam,
  updateTeam,
  deleteTeam,
  generateTeamId,
  addMember,
  removeMember,
};
