const httpStatus = require('http-status');
const { User, Address, BankDetails, SalaryDetails } = require('../models');
const EmergencyContact = require('../models/emergencyContact.model');
const ApiError = require('../utils/ApiError');
const { generateEmployeeId: generateId } = require('../utils/employeeId');
const { setPending, getPending, clearPending } = require('../utils/pendingCode');

const EMP_ID_KEY = 'employeeId';

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
      department: body.workInformation?.department,
      team: body.workInformation?.team,
      branch: body.workInformation?.branch,
      contractAgent: body.workInformation?.contractAgent,
      reportingPerson: body.workInformation?.reportingPerson,
      AttendanceType: body.workInformation?.AttendanceType,
      shiftId: body.workInformation?.shiftId,
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

const mongoose = require('mongoose');

const isObjectId = (val) => mongoose.Types.ObjectId.isValid(val) && String(new mongoose.Types.ObjectId(val)) === String(val);

/**
 * Populate workInformation refs on an array of user docs — only for valid ObjectId values
 */
const populateWorkInfo = async (docs) => {
  const fields = [
    { path: 'workInformation.department', model: 'Department' },
    { path: 'workInformation.team', model: 'Team' },
    { path: 'workInformation.branch', model: 'Branch' },
    { path: 'workInformation.shiftId', model: 'Shift' },
    { path: 'workInformation.reportingPerson', model: 'User', select: 'name employeeId email' },
  ];

  for (const doc of docs) {
    for (const { path, model, select } of fields) {
      const key = path.split('.')[1];
      const val = doc.workInformation?.[key];
      if (val && isObjectId(val)) {
        await mongoose.model(model).populate(doc, { path, select });
      }
    }
    // bankDetails array — filter to valid ObjectIds only
    if (doc.workInformation?.bankDetails?.length) {
      const validIds = doc.workInformation.bankDetails.filter(isObjectId);
      doc.workInformation.bankDetails = validIds;
      if (validIds.length) {
        await mongoose.model('BankDetails').populate(doc, { path: 'workInformation.bankDetails' });
      }
    }
  }
};

/**
 * Query for users
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryUsers = async (filter, options) => {
  const result = await User.paginate(filter, options);
  await User.populate(result.results, [
    { path: 'address' },
    { path: 'emergencyContact' },
    { path: 'userDocuments' },
    { path: 'workInformation.SalaryDetails' },
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
    .populate('workInformation.SalaryDetails');
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
  Object.assign(user, updateBody);
  await user.save();
  return user;
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

module.exports = {
  registerEmployee,
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
  generateEmployeeId,
};
