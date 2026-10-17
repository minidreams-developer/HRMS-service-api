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
  const branch = await require('../models').Branch.findOne({ _id: body.branchId, branchStatus: 'active' }).lean();
  if (!branch) throw new ApiError(httpStatus.BAD_REQUEST, 'Active Branch is required');
  if (body.departmentHead) await validateDepartmentHead(body.departmentHead, body.branchId);
  const duplicate = await Department.findOne({ branchId: body.branchId, $or: [{ departmentCode: body.departmentCode }, { departmentName: { $regex: `^${String(body.departmentName).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}$`, $options: 'i' } }] }).lean();
  if (duplicate) throw new ApiError(httpStatus.CONFLICT, 'Department already exists in this branch');
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
  const query = { ...filter };
  if (filter.branchId) query.branchId = filter.branchId;
  if (filter.search) {
    const pattern = { $regex: filter.search, $options: 'i' };
    const heads = await User.find({ name: pattern, isDeleted: { $ne: true } }).select('_id').lean();
    query.$or = [{ departmentName: pattern }, { departmentCode: pattern }, { departmentHead: { $in: heads.map((head) => head._id) } }];
    delete query.search;
  }
  if (filter.isActive !== undefined) query.isActive = filter.isActive;
  const result = await Department.paginate(query, options);
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
  const branchId = updateBody.branchId || department.branchId;
  const branch = await require('../models').Branch.findOne({ _id: branchId, branchStatus: 'active' }).lean();
  if (!branch) throw new ApiError(httpStatus.BAD_REQUEST, 'Active Branch is required');
  if (updateBody.departmentCode || updateBody.departmentName || updateBody.branchId) {
    const duplicate = await Department.findOne({ _id: { $ne: id }, branchId, $or: [{ departmentCode: updateBody.departmentCode || department.departmentCode }, { departmentName: { $regex: `^${String(updateBody.departmentName || department.departmentName).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}$`, $options: 'i' } }] }).lean();
    if (duplicate) throw new ApiError(httpStatus.CONFLICT, 'Department already exists in this branch');
  }
  if (updateBody.departmentHead) await validateDepartmentHead(updateBody.departmentHead, branchId);
  Object.assign(department, updateBody);
  if (updateBody.isActive === true) department.deactivatedAt = null;
  await department.save();
  return department;
};

async function validateDepartmentHead(userId, branchId) {
  const head = await User.findOne({ _id: userId, isDeleted: { $ne: true }, isActive: 'Active' }).select('workInformation.branch').lean();
  if (!head) throw new ApiError(httpStatus.BAD_REQUEST, 'Department head must be an active user');
  const headBranch = head.workInformation?.branch;
  if (branchId && headBranch && String(headBranch) !== String(branchId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Department head must belong to the same Branch');
  }
}

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
  if (department.isActive === false) throw new ApiError(httpStatus.BAD_REQUEST, 'Inactive Department cannot receive assignments');
  department.isActive = false;
  department.deactivatedAt = new Date();
  await department.save();
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
  const userBranch = user.workInformation?.branch;
  if (department.branchId && userBranch && String(userBranch) !== String(department.branchId)) throw new ApiError(httpStatus.BAD_REQUEST, 'User Branch does not match Department Branch');
  if (department.branchId && !userBranch) throw new ApiError(httpStatus.BAD_REQUEST, 'User Branch is required for this Department');

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
  if (department.isActive === false) throw new ApiError(httpStatus.BAD_REQUEST, 'Inactive Department cannot receive assignments');

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
