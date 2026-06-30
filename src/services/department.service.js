const httpStatus = require('http-status');
const { Department, User, Team } = require('../models');
const ApiError = require('../utils/ApiError');
const { generateDepartmentId } = require('../utils/employeeId');
const { setPending, getPending, clearPending } = require('../utils/pendingCode');

const DEPT_CODE_KEY = 'departmentCode';

/**
 * Create a department — clears the pending departmentCode once saved
 * @param {Object} body
 * @returns {Promise<Department>}
 */
const createDepartment = async (body) => {
  const department = await Department.create(body);
  if (body.departmentCode && body.departmentCode === getPending(DEPT_CODE_KEY)) {
    clearPending(DEPT_CODE_KEY);
  }
  return department;
};

/**
 * Query for departments
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryDepartments = async (filter, options) => {
  const result = await Department.paginate(filter, options);
  await Department.populate(result.results, { path: 'departmentHead', select: 'name email employeeId' });
  return result;
};

/**
 * Get department by id
 * @param {ObjectId} id
 * @returns {Promise<Department>}
 */
const getDepartmentById = async (id) => {
  return Department.findById(id).populate('departmentHead', 'name email employeeId');
};

/**
 * Update department by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<Department>}
 */
const updateDepartmentById = async (id, updateBody) => {
  const department = await getDepartmentById(id);
  if (!department) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Department not found');
  }
  Object.assign(department, updateBody);
  await department.save();
  return department;
};

/**
 * Delete department by id
 * @param {ObjectId} id
 * @returns {Promise<Department>}
 */
const deleteDepartmentById = async (id) => {
  const department = await getDepartmentById(id);
  if (!department) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Department not found');
  }
  await department.remove();
  return department;
};

/**
 * Generate a unique departmentCode not already in the database.
 * Blocks if a previously generated code has not been saved yet.
 * @returns {Promise<string>}
 */
const generateUniqueDepartmentId = async () => {
  const pending = getPending(DEPT_CODE_KEY);

  if (pending) {
    const savedInDb = await Department.exists({ departmentCode: pending });
    if (savedInDb) {
      clearPending(DEPT_CODE_KEY);
    } else {
      return pending;
    }
  }

  let departmentCode;
  let exists = true;
  while (exists) {
    departmentCode = generateDepartmentId();
    // eslint-disable-next-line no-await-in-loop
    exists = await Department.exists({ departmentCode });
  }

  setPending(DEPT_CODE_KEY, departmentCode);
  return departmentCode;
};

/**
 * Add a member to a department and update user's workInformation.department
 * @param {ObjectId} departmentId
 * @param {ObjectId} userId
 * @returns {Promise<Department>}
 */
const addMemberToDepartment = async (departmentId, userId) => {
  const department = await getDepartmentById(departmentId);
  if (!department) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Department not found');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const alreadyMember = department.departmentEmployees.some(
    (emp) => emp.toString() === userId.toString()
  );
  if (alreadyMember) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User is already a member of this department');
  }

  department.departmentEmployees.push(userId);
  await department.save();

  await User.findByIdAndUpdate(userId, {
    'workInformation.department': departmentId,
  });

  return department;
};

/**
 * Add a team to a department and update team's department field
 * @param {ObjectId} departmentId
 * @param {ObjectId} teamId
 * @returns {Promise<Department>}
 */
const addTeamToDepartment = async (departmentId, teamId) => {
  const department = await getDepartmentById(departmentId);
  if (!department) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Department not found');
  }

  const team = await Team.findById(teamId);
  if (!team) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team not found');
  }

  const alreadyAdded = department.departmentTeams.some(
    (t) => t.toString() === teamId.toString()
  );
  if (alreadyAdded) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Team is already in this department');
  }

  department.departmentTeams.push(teamId);
  await department.save();

  await Team.findByIdAndUpdate(teamId, { department: departmentId });

  return department;
};

module.exports = {
  createDepartment,
  queryDepartments,
  getDepartmentById,
  updateDepartmentById,
  deleteDepartmentById,
  generateUniqueDepartmentId,
  addMemberToDepartment,
  addTeamToDepartment,
};
