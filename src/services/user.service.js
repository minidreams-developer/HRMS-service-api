const httpStatus = require('http-status');
const { User, Address, BankDetails, SalaryDetails } = require('../models');
const EmergencyContact = require('../models/emergencyContact.model');
const ApiError = require('../utils/ApiError');
const { generateEmployeeId: generateId } = require('../utils/employeeId');
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

/**
 * Register a full employee with all related sub-documents
 * @param {Object} body
 * @returns {Promise<User>}
 */
const registerEmployee = async (body) => {
  if (body.email && (await User.isEmailTaken(body.email))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  // 1. Create addresses
  const addressIds = [];
  if (body.addresses && body.addresses.length) {
    for (const addr of body.addresses) {
      const created = await Address.create(addr);
      addressIds.push(created._id);
    }
  }

  // 2. Create emergency contacts
  const emergencyContactIds = [];
  if (body.emergencyContacts && body.emergencyContacts.length) {
    for (const ec of body.emergencyContacts) {
      const created = await EmergencyContact.create(ec);
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

  // 5. Build and create user — use pending employeeId if available
  let employeeId = getPending(EMP_ID_KEY);
  if (!employeeId) {
    employeeId = generateId();
  }
  const userData = {
    name: body.name,
    email: body.email,
    password: body.password,
    phone: body.phone,
    role: body.role || 'employee',
    gender: body.gender,
    dateOfBirth: body.dateOfBirth,
    age: body.age,
    spokenLanguages: body.spokenLanguages,
    martialStatus: body.martialStatus,
    motherTongue: body.motherTongue,
    identificationMark: body.identificationMark,
    religion: body.religion,
    documentNo: body.documentNo,
    profilePic: body.profilePic,
    employeeId,
    address: addressIds,
    emergencyContact: emergencyContactIds,
    workInformation: {
      joinedDate: body.workInformation?.joinedDate,
      experienceType: body.workInformation?.experienceType,
      department: toObjectId(body.workInformation?.department),
      team: toObjectId(body.workInformation?.team),
      branch: toObjectId(body.workInformation?.branch),
      contractAgent: toObjectId(body.workInformation?.contractAgent),
      reportingPerson: toObjectId(body.workInformation?.reportingPerson),
      AttendanceType: body.workInformation?.AttendanceType,
      shiftId: toObjectId(body.workInformation?.shiftId),
      bankDetails: bankDetailIds,
      SalaryDetails: salaryDetailsId,
      userRemarks: body.workInformation?.userRemarks,
      designation: body.workInformation?.designation,
    },
  };

  return User.create(userData).then((user) => {
    clearPending(EMP_ID_KEY);
    return user;
  });
};

/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<User>}
 */
const createUser = async (userBody) => {
  if (userBody.email && (await User.isEmailTaken(userBody.email))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  return User.create(userBody);
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
    { path: 'workInformation.shiftId',    model: 'Shift' },
    { path: 'workInformation.reportingPerson', model: 'User', select: 'name employeeId email' },
    { path: 'workInformation.contractAgent',   model: 'Agent' },
    { path: 'workInformation.jobItems',        model: 'Contractor' },
  ];

  for (const doc of docs) {
    for (const { path, model, select } of fields) {
      const key = path.split('.')[1];
      const val = doc.workInformation?.[key];
      if (val && isObjectId(val)) {
        await mongoose.model(model).populate(doc, { path, select });
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
    mongoFilter['workInformation.department'] = new mongoose.Types.ObjectId(advancedFilters.departmentId);
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
    mongoFilter['workInformation.designation'] = {
      $regex: advancedFilters.designation,
      $options: 'i',
    };
  }

  // Shift filter
  if (advancedFilters.shiftId && isObjectId(advancedFilters.shiftId)) {
    mongoFilter['workInformation.shiftId'] = new mongoose.Types.ObjectId(advancedFilters.shiftId);
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
    .populate('workInformation.bankDetails');
  if (user) await populateWorkInfo([user]);
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
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
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
  if (updateBody.address?.length) {
    const existingAddressIds = user.address || [];
    for (let i = 0; i < updateBody.address.length; i++) {
      const addrData = updateBody.address[i];
      
      if (existingAddressIds[i]) {
        await Address.findByIdAndUpdate(existingAddressIds[i], addrData);
      } else {
        const created = await Address.create(addrData);
        existingAddressIds.push(created._id);
      }
    }
    updateBody.address = existingAddressIds;
  }

  // Update emergency contacts in place
  if (updateBody.emergencyContact?.length) {
    const existingECIds = user.emergencyContact || [];
    for (let i = 0; i < updateBody.emergencyContact.length; i++) {
      const ecData = updateBody.emergencyContact[i];
      
      if (existingECIds[i]) {
        await EmergencyContact.findByIdAndUpdate(existingECIds[i], ecData);
      } else {
        const created = await EmergencyContact.create(ecData);
        existingECIds.push(created._id);
      }
    }
    updateBody.emergencyContact = existingECIds;
  }

  // ── Deep merge workInformation ─────────────────────────────────────────────
  if (updateBody.workInformation) {
    // Cast ObjectId string fields before merging
    const wi = updateBody.workInformation;
    if (wi.department)     wi.department     = toObjectId(wi.department);
    if (wi.team)           wi.team           = toObjectId(wi.team);
    if (wi.shiftId)        wi.shiftId        = toObjectId(wi.shiftId);
    if (wi.reportingPerson) wi.reportingPerson = toObjectId(wi.reportingPerson);
    if (wi.contractAgent)  wi.contractAgent  = toObjectId(wi.contractAgent);
    // branch: only cast if it's a plain ObjectId string (not a full populated object)
    if (wi.branch && typeof wi.branch === 'string') wi.branch = toObjectId(wi.branch);

    updateBody.workInformation = {
      ...((user.workInformation || {}).toObject
        ? user.workInformation.toObject()
        : user.workInformation || {}),
      ...wi,
    };
  }

  Object.assign(user, updateBody);
  await user.save();

  // Re-fetch with full population so response includes populated team, department, etc.
  return getUserById(userId);
};

/**
 * Delete user by id
 * @param {ObjectId} userId
 * @returns {Promise<User>}
 */
const deleteUserById = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  await user.remove();
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

// const getDistinctStatus = async()=>
// {
//   const status = mongoose.model('User') 
// }

module.exports = {
  registerEmployee,
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
  generateEmployeeId,
  getDistinctDepartments,
  getDistinctroles,
};
