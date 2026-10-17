const httpStatus = require('http-status');
const { User, Role, Attendance, Asset, Address, BankDetails, SalaryDetails, Commission, Shift, ShiftAssignment, Branch, Department, Team, Designation, Payroll } = require('../models');
const EmergencyContact = require('../models/emergencyContact.model');
const UserDocument = require('../models/userDocuments.model');
const ApiError = require('../utils/ApiError');
const { generateEmployeeId: generateId, generateStaffId: generateStaffIdUtil, generateAgentId: generateAgentIdUtil } = require('../utils/employeeId');
const { allocateNextNumber } = require('./seriesConfiguration.service');
const { setPending, getPending, clearPending } = require('../utils/pendingCode');
const mongoose = require('mongoose');

/**
 * Convert a value to ObjectId if it is a valid ObjectId string.
 * Returns the original value if not valid (e.g. plain strings like "agent_1").
 */
const toObjectId = (val) => {
  if (!val) return val;
  if (mongoose.Types.ObjectId.isValid(val) && String(new mongoose.Types.ObjectId(val)) === String(val)) {
    return new mongoose.Types.ObjectId(val);
  }
  return val;
};
const validateShiftAssignment = async (shiftId) => {
  if (!shiftId) return;
  const shift = await Shift.findById(shiftId).lean();
  if (!shift) throw new ApiError(httpStatus.BAD_REQUEST, 'Shift not found');
  if (!shift.isShiftActive) throw new ApiError(httpStatus.BAD_REQUEST, 'Inactive Shift cannot be assigned to a new employee');
};
const validateRoleId = async (roleId) => {
  if (!roleId) return null;
  if (!mongoose.Types.ObjectId.isValid(roleId)) throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid roleId');
  const role = await Role.findOne({ _id: roleId, isActive: true }).select('_id').lean();
  if (!role) throw new ApiError(httpStatus.BAD_REQUEST, 'Role not found or inactive');
  return role._id;
};

const refId = (value) => value && typeof value === 'object' && value._id ? value._id : value;
const validatePeopleAssignment = async (workInformation = {}, currentUserId = null) => {
  const branchId = refId(workInformation.branch);
  const departmentId = refId(workInformation.department);
  const teamId = refId(workInformation.team);
  let branch = null; let department = null; let team = null;
  if (workInformation.contractAgent) {
    const agentId = refId(workInformation.contractAgent);
    if (!isObjectId(agentId)) throw new ApiError(httpStatus.BAD_REQUEST, 'Agent must be a valid User reference for new assignments');
    const agent = await User.findOne({ _id: agentId, role: 'agent', isDeleted: { $ne: true }, isActive: 'Active' }).lean();
    if (!agent) throw new ApiError(httpStatus.BAD_REQUEST, 'Active Agent not found');
    const agentBranch = refId(agent.workInformation?.branch);
    if (branchId && agentBranch && String(branchId) !== String(agentBranch)) throw new ApiError(httpStatus.BAD_REQUEST, 'Agent and worker must belong to the same Branch');
  }
  if (workInformation.designationId) {
    const designation = await Designation.findById(refId(workInformation.designationId)).lean();
    if (!designation) throw new ApiError(httpStatus.BAD_REQUEST, 'Designation not found');
    if (!designation.isActive) throw new ApiError(httpStatus.BAD_REQUEST, 'Inactive Designation cannot be assigned');
  }
  if (branchId && isObjectId(branchId)) {
    branch = await Branch.findById(branchId).lean();
    if (!branch) throw new ApiError(httpStatus.BAD_REQUEST, 'Branch not found');
    if (branch.branchStatus === 'inactive') throw new ApiError(httpStatus.BAD_REQUEST, 'Inactive Branch cannot be assigned');
  }
  if (departmentId && isObjectId(departmentId)) {
    department = await Department.findById(departmentId).lean();
    if (!department) throw new ApiError(httpStatus.BAD_REQUEST, 'Department not found');
    if (department.isActive === false) throw new ApiError(httpStatus.BAD_REQUEST, 'Inactive Department cannot be assigned');
    if (department.branchId && branchId && String(department.branchId) !== String(branchId)) throw new ApiError(httpStatus.BAD_REQUEST, 'Department does not belong to the selected Branch');
    if (department.branchId && !branchId) throw new ApiError(httpStatus.BAD_REQUEST, 'Branch is required for this Department');
  }
  if (teamId && isObjectId(teamId)) {
    team = await Team.findById(teamId).lean();
    if (!team) throw new ApiError(httpStatus.BAD_REQUEST, 'Team not found');
    if (team.isActive === false) throw new ApiError(httpStatus.BAD_REQUEST, 'Inactive Team cannot be assigned');
    if (department && String(team.department) !== String(department._id)) throw new ApiError(httpStatus.BAD_REQUEST, 'Team does not belong to the selected Department');
    if (!department && team.department) throw new ApiError(httpStatus.BAD_REQUEST, 'Department is required for this Team');
    const teamDepartment = team.department && await Department.findById(team.department).lean();
    if (teamDepartment?.branchId && branchId && String(teamDepartment.branchId) !== String(branchId)) throw new ApiError(httpStatus.BAD_REQUEST, 'Team Department does not belong to the selected Branch');
    if (teamDepartment?.branchId && !branchId) throw new ApiError(httpStatus.BAD_REQUEST, 'Branch is required for this Team');
  }
  if (workInformation.reportingPerson !== undefined && workInformation.reportingPerson !== null && workInformation.reportingPerson !== '') {
    const managerId = refId(workInformation.reportingPerson);
    if (!isObjectId(managerId)) throw new ApiError(httpStatus.BAD_REQUEST, 'Reporting manager must be a valid User');
    if (currentUserId && String(managerId) === String(currentUserId)) throw new ApiError(httpStatus.BAD_REQUEST, 'User cannot report to self');
    const manager = await User.findById(managerId).lean();
    if (!manager) throw new ApiError(httpStatus.BAD_REQUEST, 'Reporting manager not found');
    if (manager.isDeleted || manager.isActive !== 'Active') throw new ApiError(httpStatus.BAD_REQUEST, 'Reporting manager is inactive');
    const managerBranch = refId(manager.workInformation?.branch);
    if (!branchId || !managerBranch || !isObjectId(branchId) || String(managerBranch) !== String(branchId)) throw new ApiError(httpStatus.BAD_REQUEST, 'Reporting manager must belong to the same Branch');
    const visited = new Set(); let cursor = manager;
    for (let depth = 0; depth < 100 && cursor; depth += 1) {
      const cursorId = String(cursor._id); if (visited.has(cursorId)) break; visited.add(cursorId);
      if (currentUserId && cursorId === String(currentUserId)) throw new ApiError(httpStatus.BAD_REQUEST, 'Circular reporting relationship is not allowed');
      const parent = refId(cursor.workInformation?.reportingPerson); if (!parent || !isObjectId(parent)) break;
      cursor = await User.findById(parent).lean();
    }
  }
  return true;
};

const EMP_ID_KEY  = 'employeeId';
const STAFF_ID_KEY = 'staffId';
const AGENT_ID_KEY = 'agentId';

// Accept a plain URL, but also clean Markdown links accidentally sent by
// clients: [https://example.com/file](https://example.com/file).
const normalizeFileUrl = (value) => {
  if (typeof value !== 'string') return value;
  const markdownLink = value.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  return markdownLink ? markdownLink[2] : value.trim();
};

/**
 * Register a full employee with all related sub-documents
 * @param {Object} body
 * @returns {Promise<User>}
 */
const registerEmployee = async (body) => {
  const roleId = await validateRoleId(body.roleId);
  await validateShiftAssignment(toObjectId(body.workInformation?.shiftId));
  if (body.email && (await User.isEmailTaken(body.email))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  // 1. Create addresses
  // Accept both 'address' (singular, array) and 'addresses' (plural) from the frontend
  const addressIds = [];
  const rawAddresses = body.addresses || body.address || [];
  const addressList = Array.isArray(rawAddresses) ? rawAddresses : [rawAddresses];
  for (const addr of addressList) {
    if (!addr) continue;
    if (typeof addr === 'string') {
      // already an ObjectId ref
      addressIds.push(addr);
    } else {
      const created = await Address.create(addr);
      addressIds.push(created._id);
    }
  }

  // 2. Create emergency contacts
  const emergencyContactIds = [];
  const rawContacts = body.emergencyContacts || body.emergencyContact || [];
  for (const ec of rawContacts) {
    if (!ec) continue;
    if (typeof ec === 'string') {
      emergencyContactIds.push(ec); // already an ObjectId ref
    } else {
      // If the contact has a nested address object, save it first
      let ecAddressId;
      if (ec.address && typeof ec.address === 'object') {
        const ecAddr = await Address.create(ec.address);
        ecAddressId = ecAddr._id;
      } else {
        ecAddressId = ec.address;
      }
      const created = await EmergencyContact.create({ ...ec, address: ecAddressId });
      emergencyContactIds.push(created._id);
    }
  }

  // 3. Create salary details
  let salaryDetailsId;
  if (body.salaryDetails) {
    const created = await SalaryDetails.create(body.salaryDetails);
    salaryDetailsId = created._id;
  }

  // 4. Create bank details
  const bankDetailIds = [];
  if (body.bankDetails && body.bankDetails.length) {
    for (const bd of body.bankDetails) {
      const created = await BankDetails.create(bd);
      bankDetailIds.push(created._id);
    }
  }

  // 5. Resolve employeeId:
  //    - Use body.employeeId if provided (frontend already called generate-employeeId)
  //    - Otherwise use pending or generate a new one
  let employeeId = body.employeeId;
  if (!employeeId) {
    const seriesType = ['employee', 'staff'].includes(body.role) ? body.role : null;
    employeeId = (seriesType && await allocateNextNumber(seriesType)) || getPending(EMP_ID_KEY);
    if (!employeeId) {
      employeeId = generateId();
    }
  }


  let commissionDetails;

  if(body.commissionDetails)
  {
    const data =  await Commission.create(body.commissionDetails);
    commissionDetails = data._id;
  }


  // Transform spokenLanguages from [{value, label}] to string array
  const spokenLanguages = Array.isArray(body.spokenLanguages)
    ? body.spokenLanguages.map(lang => 
        typeof lang === 'object' && lang.value ? lang.value : lang
      )
    : body.spokenLanguages || [];

  const designationInput = body.workInformation?.designationId || body.workInformation?.designation;
  const designationId = toObjectId(designationInput);
  const hasDesignationReference = isObjectId(designationInput);

  const userData = {
    name: body.name,
    email: body.email,
    password: body.password,
    phone: body.phone,
    role: body.role || 'employee',
    roleId,
    gender: body.gender,
    dateOfBirth: body.dateOfBirth,
    age: body.age,
    spokenLanguages,
    martialStatus: body.martialStatus,
    motherTongue: body.motherTongue,
    identificationMark: body.identificationMark,
    religion: body.religion,
    documentNo: body.documentNo,
    profilePic: body.profilePic,
    isActive: body.isActive || 'Active',
    employeeId,
    agentId: body.agentId,
    branch: body.branch,
    referenceDetails: body.referenceDetails,
    address: addressIds,
    emergencyContact: emergencyContactIds,
    workInformation: {
      joinedDate: body.workInformation?.joinedDate,
      experienceType: body.workInformation?.experienceType,
      department: toObjectId(body.workInformation?.department),
      team: toObjectId(body.workInformation?.team),
      // Onboarding clients may send branchId at the top level; persist it in
      // the canonical workInformation.branch field used by branch filters.
      branch: toObjectId(body.workInformation?.branch || body.branchId),
      contractAgent: toObjectId(body.workInformation?.contractAgent),
      reportingPerson: toObjectId(body.workInformation?.reportingPerson),
      AttendanceType: body.workInformation?.AttendanceType,
      shiftId: toObjectId(body.workInformation?.shiftId),
      bankDetails: bankDetailIds,
      SalaryDetails: salaryDetailsId,
      userRemarks: body.workInformation?.userRemarks,
      // Legacy text designations remain in `designation`; valid designation
      // IDs are stored canonically in the ObjectId ref field.
      designation: hasDesignationReference ? 'employee' : (body.workInformation?.designation || 'employee'),
      designationId: hasDesignationReference ? designationId : undefined,
      workExperience: body.workInformation?.workExperience,
      totalExperience: body.workInformation?.totalExperience,
      lastCompanyName: body.workInformation?.lastCompanyName,
      lastCompanyExperience: body.workInformation?.lastCompanyExperience,
      location: body.workInformation?.location,
      reference: body.workInformation?.reference,
    },
    commissionDetails:commissionDetails,
  };

  await validatePeopleAssignment(userData.workInformation);

  return User.create(userData).then(async (user) => {
    clearPending(EMP_ID_KEY);
    if (user.workInformation?.shiftId) {
      const effective = body.workInformation?.joinedDate && !Number.isNaN(new Date(body.workInformation.joinedDate).getTime())
        ? new Date(body.workInformation.joinedDate) : new Date();
      const utc = new Date(Date.UTC(effective.getUTCFullYear(), effective.getUTCMonth(), effective.getUTCDate()));
      await ShiftAssignment.create({ employeeId: user._id, shiftId: user.workInformation.shiftId, effectiveFrom: utc, assignedAt: new Date(), reason: 'Initial employee assignment' });
    }

    // Save documentImage[] if provided (pre-uploaded Cloudinary URLs)
    const rawDocs = body.documentImage || [];
    if (rawDocs.length > 0) {
      const docIds = [];
      for (const doc of rawDocs) {
        if (!doc || !doc.fileUrl) continue;
        const created = await UserDocument.create({
          userId: user._id,
          documentName: doc.documentName || doc.fileName || 'Unnamed',
          documentType: doc.documentType || 'personal',
          fileUrl: doc.fileUrl,
          fileName: doc.fileName,
          publicId: doc.publicId,
          mimeType: doc.mimeType,
          keepOriginal: doc.keepOriginal || false,
        });
        docIds.push(created._id);
      }
      if (docIds.length > 0) {
        user.userDocuments = docIds;
        await user.save();
      }
    }

    return user;
  });
};

/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<User>}
 */
const createUser = async (userBody) => {
  const roleId = await validateRoleId(userBody.roleId);
  if (userBody.email && (await User.isEmailTaken(userBody.email))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  await validateShiftAssignment(toObjectId(userBody.workInformation?.shiftId));
  await validatePeopleAssignment(userBody.workInformation);
  const user = await User.create({ ...userBody, ...(roleId ? { roleId } : {}) });
  if (user.workInformation?.shiftId) await ShiftAssignment.create({ employeeId: user._id, shiftId: user.workInformation.shiftId, effectiveFrom: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())), reason: 'Initial employee assignment' });
  return user;
};
const isObjectId = (val) => mongoose.Types.ObjectId.isValid(val) && String(new mongoose.Types.ObjectId(val)) === String(val);

/**
 * Populate workInformation refs on an array of user docs — only for valid ObjectId values
 */
const populateWorkInfo = async (docs) => {
  const fields = [
    { path: 'workInformation.department', model: 'Department', select: 'departmentName departmentCode departmentDescription' },
    { path: 'workInformation.team',       model: 'Team',       select: 'teamName teamCode teamDescription' },
    { path: 'workInformation.branch',     model: 'Branch' },
    { path: 'workInformation.designationId', model: 'Designation', select: 'designationName designationCode description isActive' },
    { path: 'workInformation.shiftId',    model: 'Shift' },
    { path: 'workInformation.contractAgent', model: 'User', select: 'name employeeId email role' },
    { path: 'workInformation.reportingPerson', model: 'User', select: 'name employeeId email' },
    { path: 'workInformation.jobItems',   model: 'Contractor' },
  ];

  for (const doc of docs) {
    if (doc.roleId && isObjectId(doc.roleId)) {
      await mongoose.model('Role').populate(doc, { path: 'roleId', select: 'name description isActive' });
    }
    for (const { path, model, select } of fields) {
      const key = path.split('.')[1];
      const val = doc.workInformation?.[key];
      if (val && isObjectId(val)) {
        await mongoose.model(model).populate(doc, { path, select });
      }
    }

    // Legacy records stored the designation reference in `designation` as a
    // string, while newer records use `designationId`. Resolve both formats.
    const workInfo = doc.workInformation;
    const designationRef = workInfo?.designationId || workInfo?.designation;
    if (designationRef && isObjectId(designationRef)) {
      const designation = await mongoose.model('Designation')
        .findById(designationRef)
        .select('designationName designationCode description isActive')
        .lean();
      if (designation) {
        if (workInfo.designationId) workInfo.designationId = designation;
        if (workInfo.designation && isObjectId(workInfo.designation)) workInfo.designation = designation;
      }
    }
  }
};

/**
 * Query for users with advanced filter support.
 * Advanced filters: search, departmentId, teamId, branchId, designation,
 *                   shiftId, gender, status, joinedFrom, joinedTo
 */
const queryUsers = async (filter, options, advancedFilters = {}) => {
  // ── Build the MongoDB filter ────────────────────────────────────────────
  const mongoFilter = {};

  // Exclude soft-deleted users by default
  mongoFilter.isDeleted = { $ne: true };

  // Free-text search across name, email, employeeId
  if (advancedFilters.search) {
    const regex = { $regex: advancedFilters.search, $options: 'i' };
    mongoFilter.$or = [
      { name:       regex },
      { email:      regex },
      { employeeId: regex },
    ];
  }

  // Basic direct-field filters (name / role from pick — only when no search)
  if (!advancedFilters.search && filter.name) {
    mongoFilter.name = { $regex: filter.name, $options: 'i' };
  }
  if (filter.role)       mongoFilter.role       = filter.role;
  if (filter.employeeId) mongoFilter.employeeId = filter.employeeId;

  // Gender filter
  if (advancedFilters.gender) {
    mongoFilter.gender = advancedFilters.gender.toLowerCase();
  }

  // Department filter — workInformation.department stores Mixed (ObjectId or object)
  if (advancedFilters.departmentId && isObjectId(advancedFilters.departmentId)) {
    const departmentId = new mongoose.Types.ObjectId(advancedFilters.departmentId);
    const clause = { $or: [
      { 'workInformation.department': { $in: [departmentId, advancedFilters.departmentId] } },
      { 'workInformation.department._id': { $in: [departmentId, advancedFilters.departmentId] } },
    ] };
    mongoFilter.$and = [...(mongoFilter.$and || []), clause];
  }

  // Team filter
  if (advancedFilters.teamId && isObjectId(advancedFilters.teamId)) {
    mongoFilter['workInformation.team'] = new mongoose.Types.ObjectId(advancedFilters.teamId);
  }

  // Branch filter
  if (advancedFilters.branchId && isObjectId(advancedFilters.branchId)) {
    mongoFilter['workInformation.branch'] = new mongoose.Types.ObjectId(advancedFilters.branchId);
  }

  // Designation filter — case-insensitive partial match
  if (advancedFilters.designation) {
    if (isObjectId(advancedFilters.designation)) {
      const designationId = new mongoose.Types.ObjectId(advancedFilters.designation);
      const clause = { $or: [
        { 'workInformation.designationId': designationId },
        { 'workInformation.designation': advancedFilters.designation },
      ] };
      mongoFilter.$and = [...(mongoFilter.$and || []), clause];
    } else {
      mongoFilter['workInformation.designation'] = { $regex: advancedFilters.designation, $options: 'i' };
    }
  }

  if (advancedFilters.designationId && isObjectId(advancedFilters.designationId)) {
    const designationId = new mongoose.Types.ObjectId(advancedFilters.designationId);
    const clause = { $or: [
      { 'workInformation.designationId': designationId },
      { 'workInformation.designation': advancedFilters.designationId },
    ] };
    mongoFilter.$and = [...(mongoFilter.$and || []), clause];
  }

  // Shift filter
  if (advancedFilters.shiftId && isObjectId(advancedFilters.shiftId)) {
    const shiftId = new mongoose.Types.ObjectId(advancedFilters.shiftId);
    const clause = { $or: [
      { 'workInformation.shiftId': { $in: [shiftId, advancedFilters.shiftId] } },
      { 'workInformation.shiftId._id': { $in: [shiftId, advancedFilters.shiftId] } },
    ] };
    mongoFilter.$and = [...(mongoFilter.$and || []), clause];
  }

  // Contract agent filter — supports both ObjectId and plain string like "agent_1"
  if (advancedFilters.contractAgent) {
    if (isObjectId(advancedFilters.contractAgent)) {
      mongoFilter['workInformation.contractAgent'] = new mongoose.Types.ObjectId(advancedFilters.contractAgent);
    } else {
      mongoFilter['workInformation.contractAgent'] = advancedFilters.contractAgent;
    }
  }

  // Status filter — maps to isActive String enum: 'Active' | 'In-Active' | 'Relieved'
  if (advancedFilters.status) {
    mongoFilter.isActive = advancedFilters.status; // value is already validated by Joi
  }

  // Joined-date range (workInformation.joinedDate)
  if (advancedFilters.joinedFrom || advancedFilters.joinedTo) {
    mongoFilter['workInformation.joinedDate'] = {};
    if (advancedFilters.joinedFrom) {
      mongoFilter['workInformation.joinedDate'].$gte = new Date(advancedFilters.joinedFrom);
    }
    if (advancedFilters.joinedTo) {
      const endDate = new Date(advancedFilters.joinedTo);
      endDate.setUTCHours(23, 59, 59, 999);
      mongoFilter['workInformation.joinedDate'].$lte = endDate;
    }
  }

  // ── Build sort options ──────────────────────────────────────────────────
  const buildSort = (sortByStr) => {
    if (!sortByStr) return undefined;
    const sortMap = {
      date:   'workInformation.joinedDate',
      name:   'name',
      status: 'isActive',
    };
    const parts = sortByStr.split(',').map((s) => {
      const [rawKey, order] = s.split(':');
      const key = sortMap[rawKey.toLowerCase()] || rawKey;
      return `${key}:${order || 'asc'}`;
    });
    return parts.join(',');
  };

  const paginateOptions = {
    limit: parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : 10,
    page:  parseInt(options.page,  10) > 0 ? parseInt(options.page,  10) : 1,
  };
  if (options.sortBy) {
    paginateOptions.sortBy = buildSort(options.sortBy);
  }

  if (options.exportAll) {
    const users = await User.find(mongoFilter)
      .sort(paginateOptions.sortBy || { createdAt: -1 })
      .lean();
    await User.populate(users, [
      { path: 'address' },
      { path: 'emergencyContact' },
      { path: 'userDocuments' },
      { path: 'workInformation.SalaryDetails' },
      { path: 'workInformation.bankDetails' },
    ]);
    await populateWorkInfo(users);
    return users;
  }

  // ── Run paginated query ─────────────────────────────────────────────────
  const result = await User.paginate(mongoFilter, paginateOptions);

  await User.populate(result.results, [
    { path: 'address' },
    { path: 'emergencyContact' },
    { path: 'userDocuments' },
    { path: 'workInformation.SalaryDetails' },
    { path: 'workInformation.bankDetails' },
  ]);
  await populateWorkInfo(result.results);

  // ── If listing agents, attach memberCount (employee + staff) per agent ──
  if (filter.role === 'agent' && result.results.length > 0) {
    const agentIds = result.results.map((a) => a._id);

    // Single aggregation: count employees/staff grouped by contractAgent
    const memberCounts = await User.aggregate([
      {
        $match: {
          role: { $in: ['employee', 'staff'] },
          'workInformation.contractAgent': { $in: agentIds },
          isDeleted: { $ne: true }, // Exclude soft-deleted users
        },
      },
      {
        $group: {
          _id: '$workInformation.contractAgent',
          count: { $sum: 1 },
        },
      },
    ]);

    // Build a lookup map: agentId (string) → count
    const countMap = {};
    for (const row of memberCounts) {
      if (row._id) countMap[String(row._id)] = row.count;
    }

    // Convert to plain objects before attaching the computed field. Mongoose's
    // toJSON transform only serializes schema paths, so assigning a dynamic
    // property directly to a document would omit memberCount from the response.
    result.results = result.results.map((agent) => {
      const plainAgent = typeof agent.toObject === 'function' ? agent.toObject() : agent;
      plainAgent.memberCount = countMap[String(agent._id)] || 0;
      return plainAgent;
    });
  }

  return result;
};

/**
 * Get user by id
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
const getUserById = async (id) => {
  const user = await User.findById(id)
    .populate('address')
    .populate('emergencyContact')
    .populate('userDocuments')
    .populate('workInformation.SalaryDetails')
    .populate('workInformation.bankDetails')
    .populate('commissionDetails');
  if (user) {
    await populateWorkInfo([user]);

    // Attendance records may be linked by either the user's MongoDB _id or
    // legacy employee code (for example, EMP531374).
    // Return the complete history for this user with the newest records first.
    const attendanceDetails = await Attendance.find({
      employeeId: { $in: [user._id, user.employeeId].filter(Boolean) },
    })
      .sort({ date: -1, createdAt: -1 })
      .populate('employeeId', 'name employeeId email phone workInformation.designation')
      .populate('shiftId', 'shiftName shiftCode shiftType timings');

    // Add it to the serialized document without making it a persisted User field.
    user._doc.attendanceDetails = attendanceDetails;
  }
  return user;
};

/**
 * Get user by employeeId (e.g. EMP001, STF001, AGT001)
 * @param {string} employeeId
 * @returns {Promise<User>}
 */
const getUserByEmployeeId = async (employeeId) => {
  const user = await User.findOne({ employeeId })
    .populate('address')
    .populate('emergencyContact')
    .populate('userDocuments')
    .populate('workInformation.SalaryDetails')
    .populate('workInformation.bankDetails');
  if (user) {
    await populateWorkInfo([user]);

    // Assets are linked to the employee by the User _id, not employeeId.
    user._doc.assets = await Asset.find({ assignedTo: user._id })
      .populate('assignedTo', 'name employeeId email')
      .sort({ issuedDate: -1, createdAt: -1 });

    // Current payroll record of the user
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const payrollRecord = await Payroll.findOne({
        employeeId: user._id,
        month: currentMonth,
        year: currentYear,
      }).lean() || await Payroll.findOne({
        employeeId: user._id,
      }).sort({ year: -1, month: -1 }).lean();

      user._doc.currentPayroll = payrollRecord || null;
      user._doc.payroll = payrollRecord || null;
      user.currentPayroll = payrollRecord || null;
      user.payroll = payrollRecord || null;
    } catch (err) {
      user._doc.currentPayroll = null;
      user._doc.payroll = null;
      user.currentPayroll = null;
      user.payroll = null;
    }
  }
  return user;
};

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<User>}
 */
const getUserByEmail = async (email) => {
  return User.findOne({ email });
};

/**
 * Update user by id
 * @param {ObjectId} userId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const updateUserById = async (userId, updateBody) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (updateBody.workInformation?.shiftId) await validateShiftAssignment(toObjectId(updateBody.workInformation.shiftId));
  if (updateBody.roleId !== undefined) updateBody.roleId = await validateRoleId(updateBody.roleId);
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  // The API exposes `status`, while the User model stores the value as
  // `isActive`. Normalize this before passing the update to Mongoose.
  if (updateBody.status !== undefined) {
    updateBody.isActive = updateBody.status;
    delete updateBody.status;
  }

  // ── Handle nested sub-documents separately ─────────────────────────────────

  // Update bank details in place (don't create new documents)
  if (updateBody.workInformation?.bankDetails?.length) {
    const existingBankIds = user.workInformation?.bankDetails || [];
    const updatedBankIds = [];
    
    for (let i = 0; i < updateBody.workInformation.bankDetails.length; i++) {
      const bankData = updateBody.workInformation.bankDetails[i];
      
      // If bankData has an 'id' or '_id' field, it's an existing document — update it
      let existingId = bankData.id || bankData._id;
      
      // Fallback: if no id provided but user has existing bank details, update by index
      if (!existingId && existingBankIds[i]) {
        existingId = existingBankIds[i];
      }
      
      // Clean up nested _id fields from esiAndPf
      if (bankData.esiAndPf?._id) {
        delete bankData.esiAndPf._id;
      }
      
      if (existingId) {
        // Remove id/_id from the update data to avoid validation issues
        const { id, _id, ...cleanBankData } = bankData;
        console.log('[updateUserById] Updating existing bank detail:', existingId);
        await BankDetails.findByIdAndUpdate(existingId, cleanBankData);
        updatedBankIds.push(existingId);
      } else {
        // No id means it's a new bank detail — create it
        console.log('[updateUserById] Creating new bank detail');
        const created = await BankDetails.create(bankData);
        updatedBankIds.push(created._id);
      }
    }
    
    // Replace with the ObjectId array
    updateBody.workInformation.bankDetails = updatedBankIds;
  }

  // Update salary details in place (don't create new document)
  if (updateBody.workInformation?.SalaryDetails) {
    const salaryData = updateBody.workInformation.SalaryDetails;
    if (user.workInformation?.SalaryDetails) {
      // Update existing
      await SalaryDetails.findByIdAndUpdate(user.workInformation.SalaryDetails, salaryData);
      updateBody.workInformation.SalaryDetails = user.workInformation.SalaryDetails;
    } else {
      // Create new
      const created = await SalaryDetails.create(salaryData);
      updateBody.workInformation.SalaryDetails = created._id;
    }
  }

  // Update addresses in place
  // Frontend sends 'addresses' (plural), model stores as 'address'
  const addressPayload = updateBody.addresses || updateBody.address;
  if (addressPayload?.length) {
    const existingAddressIds = user.address?.map(a => a._id || a) || [];
    const updatedAddressIds = [];

    for (let i = 0; i < addressPayload.length; i++) {
      const addrData = addressPayload[i];
      const existingId = addrData.id || addrData._id || existingAddressIds[i];

      if (existingId) {
        const { id, _id, ...cleanData } = addrData;
        await Address.findByIdAndUpdate(existingId, cleanData);
        updatedAddressIds.push(existingId);
      } else {
        const created = await Address.create(addrData);
        updatedAddressIds.push(created._id);
      }
    }
    updateBody.address = updatedAddressIds;
    delete updateBody.addresses; // remove plural key so it doesn't confuse mongoose
  }

  // Update emergency contacts in place
  // Frontend sends 'emergencyContacts' (plural), model stores as 'emergencyContact'
  const ecPayload = updateBody.emergencyContacts || updateBody.emergencyContact;
  if (ecPayload?.length) {
    const existingECIds = user.emergencyContact?.map(e => e._id || e) || [];
    const updatedECIds = [];

    for (let i = 0; i < ecPayload.length; i++) {
      const ecData = ecPayload[i];
      const existingId = ecData.id || ecData._id || existingECIds[i];

      if (existingId) {
        const { id, _id, ...cleanData } = ecData;
        await EmergencyContact.findByIdAndUpdate(existingId, cleanData);
        updatedECIds.push(existingId);
      } else {
        // New contact — no id provided, create it
        const { id, _id, ...cleanData } = ecData;
        const created = await EmergencyContact.create(cleanData);
        updatedECIds.push(created._id);
      }
    }
    updateBody.emergencyContact = updatedECIds;
    delete updateBody.emergencyContacts; // remove plural key
  }

  // ── Save documentImage[] sent as JSON (pre-uploaded URLs from Cloudinary) ─
  if (updateBody.documentImage && updateBody.documentImage.length > 0) {
    const docIds = [];
    for (const doc of updateBody.documentImage) {
      if (!doc || !doc.fileUrl) continue;
      const created = await UserDocument.create({
        userId,
        documentName: doc.documentName || doc.fileName || 'Unnamed',
        documentType: doc.documentType || 'personal',
        fileUrl: doc.fileUrl,
        fileName: doc.fileName,
        publicId: doc.publicId,
        mimeType: doc.mimeType,
        keepOriginal: doc.keepOriginal || false,
      });
      docIds.push(created._id);
    }
    if (docIds.length > 0) {
      await User.findByIdAndUpdate(userId, {
        $push: { userDocuments: { $each: docIds } },
      });
    }
    delete updateBody.documentImage; // don't pass it further to Object.assign
  }

  // ── Deep merge workInformation ─────────────────────────────────────────────
  if (updateBody.workInformation) {
    // Cast ObjectId string fields before merging
    const wi = updateBody.workInformation;
    if (wi.department)     wi.department     = toObjectId(wi.department);
    if (wi.team)           wi.team           = toObjectId(wi.team);
    if (wi.shiftId)        wi.shiftId        = toObjectId(wi.shiftId);
    if (wi.reportingPerson) wi.reportingPerson = toObjectId(wi.reportingPerson);
    if (wi.designationId) wi.designationId = toObjectId(wi.designationId);
    if (wi.contractAgent)  wi.contractAgent  = toObjectId(wi.contractAgent);
    // branch: only cast if it's a plain ObjectId string (not a full populated object)
    if (wi.branch && typeof wi.branch === 'string') wi.branch = toObjectId(wi.branch);

    updateBody.workInformation = {
      ...((user.workInformation || {}).toObject
        ? user.workInformation.toObject()
        : user.workInformation || {}),
      ...wi,
    };
    await validatePeopleAssignment(updateBody.workInformation, user._id);
    if (user.role === 'agent' && updateBody.workInformation.branch) {
      const linked = await User.find({ 'workInformation.contractAgent': user._id, isDeleted: { $ne: true }, isActive: 'Active' }, { 'workInformation.branch': 1 }).lean();
      const nextBranch = refId(updateBody.workInformation.branch);
      if (linked.some((worker) => worker.workInformation?.branch && String(refId(worker.workInformation.branch)) !== String(nextBranch))) throw new ApiError(httpStatus.CONFLICT, 'Reassign linked workers before changing Agent Branch');
    }
  }

  Object.assign(user, updateBody);
  await user.save();

  // Re-fetch with full population so response includes populated team, department, etc.
  return getUserById(userId);
};

const getProfile = async (userId) => getUserById(userId);

const updateProfile = async (userId, updateBody) => {
  const allowed = [
    'name', 'phone', 'profilePic', 'gender', 'dateOfBirth', 'age', 'spokenLanguages',
    'martialStatus', 'motherTongue', 'identificationMark', 'religion', 'address',
    'addresses', 'emergencyContact', 'emergencyContacts',
  ];
  const update = Object.fromEntries(Object.entries(updateBody).filter(([key]) => allowed.includes(key)));
  return updateUserById(userId, update);
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');
  if (!user || !(await user.isPasswordMatch(currentPassword))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Current password is incorrect');
  }
  if (currentPassword === newPassword) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'New password must be different from current password');
  }
  user.password = newPassword;
  await user.save();
  return getUserById(userId);
};

/**
 * Delete user by id (soft delete)
 * @param {ObjectId} userId
 * @param {ObjectId} deletedByUserId - The ID of the user performing the deletion
 * @returns {Promise<User>}
 */
const deleteUserById = async (userId, deletedByUserId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Check if already deleted
  if (user.isDeleted) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User is already deleted');
  }

  // Soft delete: mark as deleted instead of removing from database
  user.isDeleted = true;
  user.deletedAt = new Date();
  user.deletedBy = deletedByUserId || null;
  await user.save();

  return user;
};

/**
 * Generate a unique employeeId not already in the database.
 * Returns the same ID until it has been used in a registration.
 * @returns {Promise<string>}
 */
const generateEmployeeId = async () => {
  const pending = getPending(EMP_ID_KEY);

  if (pending) {
    const savedInDb = await User.exists({ employeeId: pending });
    if (savedInDb) {
      clearPending(EMP_ID_KEY);
    } else {
      return pending;
    }
  }

  let employeeId;
  let exists = true;
  while (exists) {
    employeeId = generateId();
    // eslint-disable-next-line no-await-in-loop
    exists = await User.exists({ employeeId });
  }

  setPending(EMP_ID_KEY, employeeId);
  return employeeId;
};

/**
 * Generate a unique staffId not already in the database.
 * Uses STF prefix instead of EMP.
 * @returns {Promise<string>}
 */
const generateStaffId = async () => {
  const pending = getPending(STAFF_ID_KEY);

  if (pending) {
    const savedInDb = await User.exists({ employeeId: pending });
    if (savedInDb) {
      clearPending(STAFF_ID_KEY);
    } else {
      return pending;
    }
  }

  let staffId;
  let exists = true;
  while (exists) {
    staffId = generateStaffIdUtil();
    // eslint-disable-next-line no-await-in-loop
    exists = await User.exists({ employeeId: staffId });
  }

  setPending(STAFF_ID_KEY, staffId);
  return staffId;
};

/**
 * Generate a unique agentId not already in the database.
 * Uses AGT prefix.
 * @returns {Promise<string>}
 */
const generateAgentId = async () => {
  // Generate a fresh unique ID on every call without caching
  let agentId;
  let exists = true;
  while (exists) {
    agentId = generateAgentIdUtil();
    // eslint-disable-next-line no-await-in-loop
    exists = await User.exists({ employeeId: agentId });
  }

  return agentId;
};

/**
 * Get distinct department names.
 * Queries the Department collection directly for all department names,
 * then also picks up any plain-string department values stored on users.
 * @returns {Promise<string[]>}
 */
const getDistinctDepartments = async () => {
  // 1. Get all department names from the Department collection
  const deptDocs = await mongoose.model('Department')
    .find({}, 'departmentName')
    .lean();

  const fromDeptCollection = deptDocs
    .map((d) => d.departmentName)
    .filter(Boolean);

  // 2. Also pick up any plain-string values stored directly on users
  const plainStrings = await User.distinct('workInformation.department', {
    'workInformation.department': { $type: 'string' },
  });

  // console.log(deptDocs);
  // console.log(plainStrings);
  // Merge and deduplicate
  const all = [...new Set([...fromDeptCollection, ...plainStrings.filter(Boolean)])];
  // console.log(all);
  all.sort();
  return all;
};

const getDistinctroles = async() =>
{
  const roles = await mongoose.model('User')
  .find({},'role')
  .lean();

  const fromUserCollection = roles
  .map((d)=>d.role)
  .filter(Boolean);

  const designation = [...new Set(fromUserCollection)];

  return designation;
}

/**
 * Get users for dropdown filtered by role (agent, staff, employee).
 * Returns minimal data: _id, name, employeeId, role, email
 * Supports filters: role (single or array), search
 * @param {Object} filters - { role, search }
 * @returns {Promise<Array>}
 */
const getUsersDropdown = async (filters = {}) => {
  const query = {};

  // Exclude soft-deleted users
  query.isDeleted = { $ne: true };

  // Role filter - supports single role or multiple roles
  if (filters.role) {
    const roleArray = Array.isArray(filters.role) ? filters.role : [filters.role];
    // Validate roles
    const validRoles = ['agent', 'staff', 'employee'];
    const filteredRoles = roleArray.filter(r => validRoles.includes(r));
    
    if (filteredRoles.length > 0) {
      query.role = filteredRoles.length === 1 ? filteredRoles[0] : { $in: filteredRoles };
    }
  }

  // Search filter - searches name, email, and employeeId
  if (filters.search) {
    const regex = { $regex: filters.search, $options: 'i' };
    query.$or = [
      { name: regex },
      { email: regex },
      { employeeId: regex },
    ];
  }

  // Fetch users with minimal fields for dropdown
  const users = await User.find(query)
    .select('_id name employeeId role email profilePic workInformation.shiftId')
    .sort({ name: 1 })
    .lean();

  const shiftIds = users
    .map((user) => user.workInformation?.shiftId)
    .filter((value) => value && mongoose.Types.ObjectId.isValid(String(value)))
    .map((value) => new mongoose.Types.ObjectId(String(value)));
  const shifts = await Shift.find({ _id: { $in: shiftIds } })
    .select('_id shiftName shiftCode')
    .lean();
  const shiftsById = new Map(shifts.map((shift) => [String(shift._id), shift]));

  return users.map((user) => {
    const shiftId = user.workInformation?.shiftId || null;
    const shift = shiftId ? shiftsById.get(String(shiftId)) : null;
    return {
      _id: user._id,
      name: user.name,
      employeeId: user.employeeId,
      role: user.role,
      email: user.email,
      profilePic: user.profilePic,
      shiftId: shiftId || null,
      shiftName: shift?.shiftName || null,
      shiftCode: shift?.shiftCode || null,
    };
  });
}

// const getDistinctStatus = async()=>
// {
//   const status = mongoose.model('User') 
// }

/**
 * Upload documents for a user.
 * Supports two modes:
 * 1. File upload: Creates UserDocument records from uploaded files (multer) - NOT RECOMMENDED
 * 2. Pre-uploaded URLs: Creates UserDocument records from pre-uploaded Cloudinary URLs (RECOMMENDED)
 *    Frontend should:
 *    a) Upload files to /v1/media/upload first
 *    b) Get back { files: [{ url, originalName, publicId, mimeType, ... }] }
 *    c) Send those URLs to this endpoint as { documents: [{ fileUrl, documentName, ... }] }
 *
 * @param {ObjectId} userId
 * @param {Array}    files          - multer file objects (from req.files) - optional
 * @param {string}   documentType   - 'government' | 'personal'
 * @param {Array}    preUploadedDocs - pre-uploaded document objects with fileUrl, documentName, etc. - optional
 * @returns {Promise<User>}
 */
const uploadUserDocuments = async (userId, files, documentType = 'personal', preUploadedDocs = null) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Check if we have either files or pre-uploaded documents
  const hasFiles = files && files.length > 0;
  const hasPreUploadedDocs = preUploadedDocs && preUploadedDocs.length > 0;

  if (!hasFiles && !hasPreUploadedDocs) {
    throw new ApiError(
      httpStatus.BAD_REQUEST, 
      'No documents provided. Send either files via multipart/form-data or pre-uploaded URLs in JSON body. ' +
      'Recommended: upload to /v1/media/upload first, then send URLs here.'
    );
  }

  const docIds = [];

  // Handle file uploads (multipart/form-data) - NOT RECOMMENDED
  if (hasFiles) {
    for (const file of files) {
      const doc = await UserDocument.create({
        userId,
        documentName: file.originalname,
        documentType,
        fileUrl: file.path, // Cloudinary returns the secure URL in file.path
        fileName: file.originalname,
        mimeType: file.mimetype,
        publicId: file.filename, // Cloudinary public_id
      });
      docIds.push(doc._id);
    }
  }

  // Handle pre-uploaded documents (JSON payload) - RECOMMENDED
  if (hasPreUploadedDocs) {
    for (const doc of preUploadedDocs) {
      // Skip invalid entries
      if (!doc) continue;
      
      // fileUrl is required (can be 'url' from /v1/media/upload or 'fileUrl')
      const fileUrl = normalizeFileUrl(doc.fileUrl || doc.url);
      if (!fileUrl) {
        console.warn('[uploadUserDocuments] Skipping document without fileUrl:', doc);
        continue;
      }

      const created = await UserDocument.create({
        userId,
        documentName: doc.documentName || doc.originalName || doc.fileName || 'Unnamed Document',
        documentType: doc.documentType || documentType,
        fileUrl,
        fileName: doc.fileName || doc.originalName,
        publicId: doc.publicId,
        mimeType: doc.mimeType,
        keepOriginal: doc.keepOriginal || false,
      });
      docIds.push(created._id);
    }
  }

  // Link the new document IDs to the user
  if (docIds.length > 0) {
    await User.findByIdAndUpdate(userId, {
      $push: { userDocuments: { $each: docIds } },
    });
  }

  return getUserById(userId);
};

/**
 * Get employee/staff stats — total, active, inactive, new (joined this month).
 * Pass ?role=employee or ?role=staff to scope the stats.
 * Also supports: branchId, departmentId, teamId filters.
 * @returns {Promise<Object>}
 */
const getEmployeeCount = async (filters = {}) => {
  const baseQuery = {};

  // Exclude soft-deleted users
  baseQuery.isDeleted = { $ne: true };

  // Role filter — defaults to 'employee' if not provided
  baseQuery.role = filters.role || 'employee';

  // Optional filters
  if (filters.departmentId && isObjectId(filters.departmentId)) {
    baseQuery['workInformation.department'] = toObjectId(filters.departmentId);
  }
  if (filters.teamId && isObjectId(filters.teamId)) {
    baseQuery['workInformation.team'] = toObjectId(filters.teamId);
  }
  if (filters.branchId && isObjectId(filters.branchId)) {
    baseQuery['workInformation.branch'] = toObjectId(filters.branchId);
  }

  // New employees — use the requested joined-date range when supplied;
  // otherwise default to the current calendar month.
  const now = new Date();
  const monthStart = filters.joinedFrom
    ? new Date(`${filters.joinedFrom}T00:00:00.000Z`)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = filters.joinedTo
    ? new Date(`${filters.joinedTo}T23:59:59.999Z`)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  const [total, active, inactive, relieved, newEmployees] = await Promise.all([
    User.countDocuments({ ...baseQuery }),
    User.countDocuments({ ...baseQuery, isActive: 'Active' }),
    User.countDocuments({ ...baseQuery, isActive: 'In-Active' }),
    User.countDocuments({ ...baseQuery, isActive: 'Relieved' }),
    User.countDocuments({
      ...baseQuery,
      'workInformation.joinedDate': { $gte: monthStart, $lte: monthEnd },
    }),
  ]);

  return {
    role: baseQuery.role,
    total,
    active,
    inactive,
    relieved,
    newEmployees,
  };
};

/**
 * Update a user document by userId and documentId.
 * Updates document metadata (documentName, documentType, etc.)
 *
 * @param {ObjectId} userId
 * @param {ObjectId} documentId
 * @param {Object} updateBody - { documentName, documentType, fileUrl, fileName, mimeType, publicId }
 * @returns {Promise<UserDocument>}
 */
const updateUserDocument = async (userId, documentId, updateBody) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const document = await UserDocument.findOne({ _id: documentId, userId });
  if (!document) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Document not found');
  }

  // Update allowed fields
  const allowedUpdates = ['documentName', 'documentType', 'fileUrl', 'fileName', 'mimeType', 'publicId', 'keepOriginal'];
  const updates = {};
  
  allowedUpdates.forEach((field) => {
    if (updateBody[field] !== undefined) {
      updates[field] = field === 'fileUrl'
        ? normalizeFileUrl(updateBody[field])
        : updateBody[field];
    }
  });

  Object.assign(document, updates);
  await document.save();

  return document;
};

/**
 * Delete a user document by userId and documentId.
 * Removes the document from the UserDocument collection and the user's userDocuments array.
 *
 * @param {ObjectId} userId
 * @param {ObjectId} documentId
 * @returns {Promise<void>}
 */
const deleteUserDocument = async (userId, documentId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const document = await UserDocument.findOne({ _id: documentId, userId });
  if (!document) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Document not found');
  }

  // Remove the document from UserDocument collection
  await UserDocument.findByIdAndDelete(documentId);

  // Remove the document reference from the user's userDocuments array
  await User.findByIdAndUpdate(userId, {
    $pull: { userDocuments: documentId },
  });
};

/**
 * Get all employees & staff under a specific agent (by agent's _id or agentId string),
 * along with summary counts: total, active, inactive, relieved, and new today.
 *
 * "New today" = joinedDate falls within today's calendar day (UTC).
 *
 * @param {string} agentId   - The agent's MongoDB _id OR agentId string (e.g. "AGT804660")
 * @param {Object} options   - Pagination: { page, limit }
 * @param {Object} filters   - { status, joinedFrom, joinedTo, role }
 * @returns {Promise<Object>}
 */
const getAgentMembers = async (agentId, options = {}, filters = {}) => {
  // Build the contractAgent match — support both ObjectId and plain string agentId
  const contractAgentMatch = isObjectId(agentId)
    ? new mongoose.Types.ObjectId(agentId)
    : agentId;

  // ── Base filter: only employee/staff belonging to this agent ────────────
  const baseFilter = {
    role: filters.role && ['employee', 'staff'].includes(filters.role)
      ? filters.role
      : { $in: ['employee', 'staff'] },
    'workInformation.contractAgent': contractAgentMatch,
    isDeleted: { $ne: true }, // Exclude soft-deleted users
  };

  // ── Summary counts always use the base filter (no status/date applied) ──
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const todayEnd   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  const [total, active, inActive, relieved, newToday] = await Promise.all([
    User.countDocuments(baseFilter),
    User.countDocuments({ ...baseFilter, isActive: 'Active' }),
    User.countDocuments({ ...baseFilter, isActive: 'In-Active' }),
    User.countDocuments({ ...baseFilter, isActive: 'Relieved' }),
    User.countDocuments({
      ...baseFilter,
      'workInformation.joinedDate': { $gte: todayStart, $lte: todayEnd },
    }),
  ]);

  // ── List filter: apply optional status + joined date range ──────────────
  const listFilter = { ...baseFilter };

  if (filters.status) {
    listFilter.isActive = filters.status; // 'Active' | 'In-Active' | 'Relieved'
  }
  if (filters.branch) listFilter['workInformation.branch'] = isObjectId(filters.branch) ? new mongoose.Types.ObjectId(filters.branch) : filters.branch;
  if (filters.department) listFilter['workInformation.department'] = isObjectId(filters.department) ? new mongoose.Types.ObjectId(filters.department) : filters.department;
  if (filters.team) listFilter['workInformation.team'] = isObjectId(filters.team) ? new mongoose.Types.ObjectId(filters.team) : filters.team;
  if (filters.search) listFilter.$or = [{ name: { $regex: filters.search, $options: 'i' } }, { employeeId: { $regex: filters.search, $options: 'i' } }];

  if (filters.joinedFrom || filters.joinedTo) {
    listFilter['workInformation.joinedDate'] = {};
    if (filters.joinedFrom) {
      listFilter['workInformation.joinedDate'].$gte = new Date(filters.joinedFrom);
    }
    if (filters.joinedTo) {
      const endDate = new Date(filters.joinedTo);
      endDate.setUTCHours(23, 59, 59, 999);
      listFilter['workInformation.joinedDate'].$lte = endDate;
    }
  }

  // ── Paginated member list ────────────────────────────────────────────────
  const limit = parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : 10;
  const page  = parseInt(options.page,  10) > 0 ? parseInt(options.page,  10) : 1;

  const paginateResult = await User.paginate(listFilter, {
    limit,
    page,
    sort: options.sortBy || { createdAt: -1 },
  });

  // Populate sub-documents
  await User.populate(paginateResult.results, [
    { path: 'address' },
    { path: 'emergencyContact' },
    { path: 'workInformation.SalaryDetails' },
    { path: 'workInformation.bankDetails' },
  ]);
  await populateWorkInfo(paginateResult.results);

  return {
    summary: {
      total,
      active,
      inActive,
      relieved,
      newToday,
    },
    ...paginateResult,
  };
};

const assignAgentWorkers = async (agentId, workerIds) => {
  const agent = await User.findOne({ $or: [{ _id: isObjectId(agentId) ? agentId : null }, { agentId }], role: 'agent', isDeleted: { $ne: true }, isActive: 'Active' }).lean();
  if (!agent) throw new ApiError(httpStatus.BAD_REQUEST, 'Active Agent not found');
  const ids = [...new Set((workerIds || []).map(String))];
  const workers = await User.find({ _id: { $in: ids } }).lean();
  if (workers.length !== ids.length) throw new ApiError(httpStatus.BAD_REQUEST, 'One or more workers not found');
  for (const worker of workers) {
    if (!['employee', 'staff'].includes(worker.role) || worker.isDeleted || worker.isActive !== 'Active') throw new ApiError(httpStatus.BAD_REQUEST, 'Only active employee/staff users can be assigned');
    const existing = worker.workInformation?.contractAgent;
    if (existing && String(existing?._id || existing) !== String(agent._id)) throw new ApiError(httpStatus.CONFLICT, 'Worker is already linked to another Agent');
    const agentBranch = refId(agent.workInformation?.branch); const workerBranch = refId(worker.workInformation?.branch);
    if (agentBranch && workerBranch && String(agentBranch) !== String(workerBranch)) throw new ApiError(httpStatus.BAD_REQUEST, 'Agent and worker must belong to the same Branch');
  }
  await User.updateMany({ _id: { $in: ids } }, { $set: { 'workInformation.contractAgent': agent._id } });
  return getAgentMembers(agent._id, { page: 1, limit: 100 }, {});
};

const removeAgentWorker = async (agentId, workerId) => {
  const agent = await User.findOne({ $or: [{ _id: isObjectId(agentId) ? agentId : null }, { agentId }], role: 'agent' }).lean();
  const worker = await User.findById(workerId);
  if (!agent || !worker) throw new ApiError(httpStatus.NOT_FOUND, 'Agent or worker not found');
  const current = worker.workInformation?.contractAgent;
  if (String(current?._id || current) !== String(agent._id)) throw new ApiError(httpStatus.CONFLICT, 'Worker is linked to another Agent');
  worker.workInformation.contractAgent = null; await worker.save(); return worker;
};

module.exports = {
  registerEmployee,
  createUser,
  queryUsers,
  getUserById,
  getUserByEmployeeId,
  getUserByEmail,
  updateUserById,
  getProfile,
  updateProfile,
  changePassword,
  deleteUserById,
  generateEmployeeId,
  generateStaffId,
  generateAgentId,
  uploadUserDocuments,
  updateUserDocument,
  deleteUserDocument,
  getEmployeeCount,
  getDistinctDepartments,
  getDistinctroles,
  getAgentMembers,
  assignAgentWorkers,
  removeAgentWorker,
  getUsersDropdown,
};
