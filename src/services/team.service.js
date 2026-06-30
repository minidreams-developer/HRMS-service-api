const httpStatus = require('http-status');
const { Team, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { generateTeamId } = require('../utils/employeeId');
const { setPending, getPending, clearPending } = require('../utils/pendingCode');

const TEAM_CODE_KEY = 'teamCode';

/**
 * Create a team — clears the pending teamCode once saved
 * @param {Object} body
 * @returns {Promise<Team>}
 */
const createTeam = async (body) => {
  const team = await Team.create(body);
  // If the saved teamCode matches the pending one, clear it
  if (body.teamCode && body.teamCode === getPending(TEAM_CODE_KEY)) {
    clearPending(TEAM_CODE_KEY);
  }
  return team;
};

/**
 * Query for teams
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryTeams = async (filter, options) => {
  const result = await Team.paginate(filter, options);
  await Team.populate(result.results, { path: 'department', select: 'departmentName' });
  await Team.populate(result.results, { path: 'teamLead', select: 'name' });
  result.results = result.results.map((team) => {
    const t = team.toJSON ? team.toJSON() : team;
    t.totalUsers = Array.isArray(t.teamEmployees) ? t.teamEmployees.length : 0;
    return t;
  });
  return result;
};

/**
 * Get team by id
 * @param {ObjectId} id
 * @returns {Promise<Team>}
 */
const getTeamById = async (id) => {
  const team = await Team.findById(id)
    .populate('department', 'departmentName')
    .populate('teamLead', 'name');
  if (!team) return null;
  const t = team.toJSON();
  t.totalUsers = Array.isArray(t.teamEmployees) ? t.teamEmployees.length : 0;
  return t;
};

/**
 * Update team by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<Team>}
 */
const updateTeamById = async (id, updateBody) => {
  const team = await getTeamById(id);
  if (!team) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team not found');
  }
  Object.assign(team, updateBody);
  await team.save();
  return team;
};

/**
 * Delete team by id
 * @param {ObjectId} id
 * @returns {Promise<Team>}
 */
const deleteTeamById = async (id) => {
  const team = await getTeamById(id);
  if (!team) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team not found');
  }
  await team.remove();
  return team;
};

/**
 * Generate a unique teamCode not already in the database.
 * Blocks if a previously generated code has not been saved yet.
 * @returns {Promise<string>}
 */
const generateUniqueTeamId = async () => {
  const pending = getPending(TEAM_CODE_KEY);

  // If there's a pending code, check if it was already saved to DB
  if (pending) {
    const savedInDb = await Team.exists({ teamCode: pending });
    if (savedInDb) {
      // It was saved — clear it and generate a fresh one
      clearPending(TEAM_CODE_KEY);
    } else {
      // Not yet saved — return the same pending code
      return pending;
    }
  }

  // Generate a new unique code
  let teamCode;
  let exists = true;
  while (exists) {
    teamCode = generateTeamId();
    // eslint-disable-next-line no-await-in-loop
    exists = await Team.exists({ teamCode });
  }

  setPending(TEAM_CODE_KEY, teamCode);
  return teamCode;
};

/**
 * Add a member to a team and update the user's workInformation.team
 * @param {ObjectId} teamId
 * @param {ObjectId} userId
 * @returns {Promise<Team>}
 */
const addMemberToTeam = async (teamId, userId) => {
  const team = await getTeamById(teamId);
  if (!team) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team not found');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Check if user is already in the team
  const alreadyMember = team.teamEmployees.some(
    (emp) => emp.toString() === userId.toString()
  );
  if (alreadyMember) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User is already a member of this team');
  }

  // Add user to team's employee array
  team.teamEmployees.push(userId);
  await team.save();

  // Update user's workInformation.team
  await User.findByIdAndUpdate(userId, {
    'workInformation.team': teamId,
  });

  return team;
};

module.exports = {
  createTeam,
  queryTeams,
  getTeamById,
  updateTeamById,
  deleteTeamById,
  generateUniqueTeamId,
  addMemberToTeam,
};
