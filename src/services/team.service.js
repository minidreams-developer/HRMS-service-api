const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { Team, User, Department, Shift } = require('../models');
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
  const department = body.department && await require('../models').Department.findOne({ _id: body.department, isActive: { $ne: false } }).lean();
  if (!department) throw new ApiError(httpStatus.BAD_REQUEST, 'Active Department is required');
  const duplicate = await Team.findOne({ department: body.department, $or: [{ teamCode: body.teamCode }, { teamName: { $regex: `^${String(body.teamName).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}$`, $options: 'i' } }] }).lean();
  if (duplicate) throw new ApiError(httpStatus.CONFLICT, 'Team already exists in this department');
  const team = await Team.create(body);
  // If the saved teamCode matches the pending one, clear it
  if (body.teamCode && body.teamCode === getPending(TEAM_CODE_KEY)) {
    clearPending(TEAM_CODE_KEY);
  }
  return team;
};

/**
 * Query for teams with search and filter support.
 *
 * Filter keys:
 *   search       — case-insensitive regex across teamName, teamCode, teamDescription
 *   teamName     — partial case-insensitive match
 *   teamCode     — exact match
 *   teamLead     — exact match (ObjectId string)
 *   departmentId — exact ObjectId match on department field
 *
 * @param {Object} filter
 * @param {Object} options - sortBy, limit, page
 * @returns {Promise<QueryResult>}
 */
const queryTeams = async (filter, options) => {
  const mongoFilter = {};

  // Free-text search across name, code and description
  if (filter.search) {
    const regex = { $regex: filter.search, $options: 'i' };
    mongoFilter.$or = [
      { teamName:        regex },
      { teamCode:        regex },
      { teamDescription: regex },
    ];
  }

  // Exact / partial field filters (only applied when search is not set)
  if (!filter.search) {
    if (filter.teamName) {
      mongoFilter.teamName = { $regex: filter.teamName, $options: 'i' };
    }
    if (filter.teamCode) {
      mongoFilter.teamCode = filter.teamCode;
    }
    if (filter.teamLead) {
      mongoFilter.teamLead = filter.teamLead;
    }
  }

  // Department filter
  if (filter.departmentId) {
    mongoFilter.department = filter.departmentId;
  }
  // Exclude soft-deactivated teams by default. Pass isActive=false explicitly
  // when management needs to view historical/deactivated teams.
  mongoFilter.isActive = filter.isActive !== undefined ? filter.isActive : true;

  const result = await Team.paginate(mongoFilter, options);
  await Team.populate(result.results, { path: 'department', select: 'departmentName' });
  await Team.populate(result.results, { path: 'teamLead', select: 'name' });

  // Get accurate member counts from the User collection
  const teamIds = result.results.map((t) => t._id);
  const memberCounts = await User.aggregate([
    {
      $match: {
        'workInformation.team': { $in: teamIds },
        isDeleted: { $ne: true }, // Exclude soft-deleted users
      },
    },
    {
      $group: {
        _id: '$workInformation.team',
        count: { $sum: 1 },
      },
    },
  ]);
  const countMap = {};
  for (const row of memberCounts) {
    if (row._id) countMap[String(row._id)] = row.count;
  }

  const listedMemberIds = result.results.flatMap((team) => team.teamEmployees || []);
  const memberDetails = await User.find({
    $or: [
      { 'workInformation.team': { $in: teamIds } },
      { _id: { $in: listedMemberIds } },
    ],
    isDeleted: { $ne: true },
  }).select('name employeeId email role isActive workInformation.joinedDate workInformation.shiftId workInformation.department workInformation.team').lean();

  result.results = result.results.map((team) => {
    const t = team.toJSON ? team.toJSON() : team;
    t.members = memberDetails.filter((member) => {
      const memberTeam = member.workInformation?.team;
      return String(memberTeam?._id || memberTeam || '') === String(t.id || t._id)
        || (t.teamEmployees || []).some((id) => String(id) === String(member._id));
    });
    t.totalUsers = countMap[String(t.id)] || (Array.isArray(t.teamEmployees) ? t.teamEmployees.length : 0);
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
  const members = await User.find({
    $or: [
      { 'workInformation.team': team._id },
      { _id: { $in: team.teamEmployees || [] } },
    ],
    isDeleted: { $ne: true },
  }).select('name employeeId email role isActive workInformation.joinedDate workInformation.shiftId workInformation.department workInformation.team').lean();
  const refId = (value) => value && typeof value === 'object' && value._id ? value._id : value;
  const departmentIds = members.map((member) => refId(member.workInformation?.department)).filter((value) => value && mongoose.Types.ObjectId.isValid(String(value)));
  const shiftIds = members.map((member) => refId(member.workInformation?.shiftId)).filter((value) => value && mongoose.Types.ObjectId.isValid(String(value)));
  const [departments, shifts] = await Promise.all([
    Department.find({ _id: { $in: departmentIds } }).select('departmentName departmentCode departmentDescription branchId').lean(),
    Shift.find({ _id: { $in: shiftIds } }).select('shiftName shiftCode shiftType timings weekOff minWorkingHours halfDayWorkingHours overtimeAfterHours').lean(),
  ]);
  const departmentsById = new Map(departments.map((department) => [String(department._id), department]));
  const shiftsById = new Map(shifts.map((shift) => [String(shift._id), shift]));
  t.members = members.map((member) => ({
    ...member,
    workInformation: {
      ...member.workInformation,
      department: departmentsById.get(String(refId(member.workInformation?.department))) || member.workInformation?.department || null,
      shiftId: shiftsById.get(String(refId(member.workInformation?.shiftId))) || member.workInformation?.shiftId || null,
    },
  }));
  t.totalUsers = members.length || (Array.isArray(t.teamEmployees) ? t.teamEmployees.length : 0);
  return t;
};

/**
 * Update team by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<Team>}
 */
const updateTeamById = async (id, updateBody) => {
  const team = await Team.findById(id);
  if (!team) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team not found');
  }
  const department = await require('../models').Department.findOne({ _id: updateBody.department || team.department, isActive: { $ne: false } }).lean();
  if (!department) throw new ApiError(httpStatus.BAD_REQUEST, 'Active Department is required');
  if (updateBody.teamCode || updateBody.teamName || updateBody.department) {
    const duplicate = await Team.findOne({ _id: { $ne: id }, department: department._id, $or: [{ teamCode: updateBody.teamCode || team.teamCode }, { teamName: { $regex: `^${String(updateBody.teamName || team.teamName).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}$`, $options: 'i' } }] }).lean();
    if (duplicate) throw new ApiError(httpStatus.CONFLICT, 'Team already exists in this department');
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
  const team = await Team.findById(id);
  if (!team) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team not found');
  }
  team.isActive = false;
  team.deactivatedAt = new Date();
  await team.save();
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
  // Use the Mongoose document here because this operation persists changes.
  const team = await Team.findById(teamId);
  if (!team) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team not found');
  }
  if (!team.isActive) throw new ApiError(httpStatus.BAD_REQUEST, 'Inactive Team cannot receive assignments');

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (user.isDeleted) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot assign a deleted user to a team');
  }
  const refId = (value) => value && typeof value === 'object' && value._id ? value._id : value;
  const userDepartment = refId(user.workInformation?.department);
  if (userDepartment && String(userDepartment) !== String(team.department)) throw new ApiError(httpStatus.BAD_REQUEST, 'User Department does not match Team Department');
  const teamDepartment = await require('../models').Department.findById(team.department).lean();
  const userBranch = refId(user.workInformation?.branch);
  const departmentBranch = refId(teamDepartment?.branchId);
  if (departmentBranch && userBranch && String(departmentBranch) !== String(userBranch)) throw new ApiError(httpStatus.BAD_REQUEST, 'User Branch does not match Team Department Branch');

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

const removeMemberFromTeam = async (teamId, userId) => {
  const team = await Team.findById(teamId);
  if (!team) throw new ApiError(httpStatus.NOT_FOUND, 'Team not found');
  const memberIndex = team.teamEmployees.findIndex((memberId) => String(memberId) === String(userId));
  if (memberIndex === -1) throw new ApiError(httpStatus.NOT_FOUND, 'User is not a member of this team');
  team.teamEmployees.splice(memberIndex, 1);
  await team.save();
  await User.updateOne({ _id: userId, 'workInformation.team': team._id }, { $unset: { 'workInformation.team': 1 } });
};

module.exports = {
  createTeam,
  queryTeams,
  getTeamById,
  updateTeamById,
  deleteTeamById,
  generateUniqueTeamId,
  addMemberToTeam,
  removeMemberFromTeam,
};
