const httpStatus = require('http-status');
const { User, Address, BankDetails, SalaryDetails } = require('../models');
const EmergencyContact = require('../models/emergencyContact.model');
const UserDocument = require('../models/userDocuments.model');
const ApiError = require('../utils/ApiError');
const { generateEmployeeId: generateId, generateStaffId: generateStaffIdUtil, generateAgentId: generateAgentIdUtil } = require('../utils/employeeId');
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

const EMP_ID_KEY  = 'employeeId';
const STAFF_ID_KEY = 'staffId';
const AGENT_ID_KEY = 'agentId';

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
    employeeId = getPending(EMP_ID_KEY);
    if (!employeeId) {
      employeeId = generateId();
    }
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
    spokenLanguages: body.spokenLanguages || [],
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
      branch: toObjectId(body.workInformation?.branch),
      contractAgent: toObjectId(body.workInformation?.contractAgent),
      reportingPerson: toObjectId(body.workInformation?.reportingPerson),
      AttendanceType: body.workInformation?.AttendanceType,
      shiftId: toObjectId(body.workInformation?.shiftId),
      bankDetails: bankDetailIds,
      SalaryDetails: salaryDetailsId,
      userRemarks: body.workInformation?.userRemarks,
      designation: body.workInformation?.designation || 'employee',
      workExperience: body.workInformation?.workExperience,
      totalExperience: body.workInformation?.totalExperience,
      lastCompanyName: body.workInformation?.lastCompanyName,
      lastCompanyExperience: body.workInformation?.lastCompanyExperience,
      location: body.workInformation?.location,
      reference: body.workInformation?.reference,
    },
  };

  return User.create(userData).then(async (user) => {
    clearPending(EMP_ID_KEY);

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
    { path: 'workInformation.jobItems',   model: 'Contractor' },
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

    // Attach memberCount to each agent doc
    for (const agent of result.results) {
      agent.memberCount = countMap[String(agent._id)] || 0;
    }
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
    .populate('workInformation.bankDetails');
  if (user) await populateWorkInfo([user]);
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
  const pending = getPending(AGENT_ID_KEY);

  if (pending) {
    const savedInDb = await User.exists({ employeeId: pending });
    if (savedInDb) {
      clearPending(AGENT_ID_KEY);
    } else {
      return pending;
    }
  }

  let agentId;
  let exists = true;
  while (exists) {
    agentId = generateAgentIdUtil();
    // eslint-disable-next-line no-await-in-loop
    exists = await User.exists({ employeeId: agentId });
  }

  setPending(AGENT_ID_KEY, agentId);
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

// const getDistinctStatus = async()=>
// {
//   const status = mongoose.model('User') 
// }

/**
 * Upload documents for a user.
 * Creates a UserDocument record for each uploaded file and links them to the user.
 *
 * @param {ObjectId} userId
 * @param {Array}    files        - multer file objects (from req.files)
 * @param {string}   documentType - 'government' | 'personal'
 * @returns {Promise<User>}
 */
const uploadUserDocuments = async (userId, files, documentType = 'personal') => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (!files || files.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No files uploaded');
  }

  // Create a UserDocument record for each uploaded file
  const docIds = [];
  for (const file of files) {
    const doc = await UserDocument.create({
      userId,
      documentName: file.originalname,
      documentType,
      fileUrl: file.path, // Cloudinary returns the secure URL in file.path
    });
    docIds.push(doc._id);
  }

  // Link the new document IDs to the user
  await User.findByIdAndUpdate(userId, {
    $push: { userDocuments: { $each: docIds } },
  });

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

  // "New this month" — joined in the current calendar month
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  const [total, active, inactive, relieved, newThisMonth] = await Promise.all([
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
    newThisMonth,
  };
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
    sort: { createdAt: -1 },
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

module.exports = {
  registerEmployee,
  createUser,
  queryUsers,
  getUserById,
  getUserByEmployeeId,
  getUserByEmail,
  updateUserById,
  deleteUserById,
  generateEmployeeId,
  generateStaffId,
  generateAgentId,
  uploadUserDocuments,
  getEmployeeCount,
  getDistinctDepartments,
  getDistinctroles,
  getAgentMembers,
};
