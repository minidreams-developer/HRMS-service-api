const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { User, Address } = require('../models');
const Contractor = require('../models/contractors.model');
const LogWork = require('../models/logWork.model');
const EmergencyContact = require('../models/emergencyContact.model');
const ApiError = require('../utils/ApiError');
const { setPending, getPending, clearPending } = require('../utils/pendingCode');
const { ContractorWorkerAssignment } = require('../models');
const { allocateNextNumber } = require('./seriesConfiguration.service');

const CTR_ID_KEY = 'contractorId';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Generate a unique contractor ID (CTR-XXXXXX)
 * @returns {string}
 */
const generateContractorIdCode = () => {
  const randomNumber = Math.floor(100000 + Math.random() * 900000);
  return `CTR-${randomNumber}`;
};

const isObjectId = (val) =>
  mongoose.Types.ObjectId.isValid(val) && String(new mongoose.Types.ObjectId(val)) === String(val);

// ─── Generate Contractor ID ──────────────────────────────────────────────────

/**
 * Generate a unique contractorId that is not already in the DB.
 * Reserves the code in memory until it is confirmed saved.
 * @returns {Promise<string>}
 */
const generateContractorId = async () => {
  const pending = getPending(CTR_ID_KEY);

  if (pending) {
    const savedInDb = await User.exists({ employeeId: pending });
    if (savedInDb) {
      clearPending(CTR_ID_KEY);
    } else {
      return pending;
    }
  }

  let contractorId;
  let exists = true;
  while (exists) {
    contractorId = await allocateNextNumber('contractor') || generateContractorIdCode();
    // eslint-disable-next-line no-await-in-loop
    exists = await User.exists({ employeeId: contractorId });
  }

  setPending(CTR_ID_KEY, contractorId);
  return contractorId;
};

// ─── Register Contractor ─────────────────────────────────────────────────────

/**
 * Register a full contractor:
 *  1. Create address sub-document
 *  2. Create emergency contact (with its own address if provided)
 *  3. Create Contractor job-items documents (one per region entry)
 *  4. Create the User document with role = 'contractor'
 *
 * @param {Object} body
 * @returns {Promise<User>}
 */
const registerContractor = async (body) => {
  // ── Email uniqueness check ─────────────────────────────────────────────────
  if (body.email && (await User.isEmailTaken(body.email))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  // ── 1. Create contractor address ──────────────────────────────────────────
  let addressId;
  if (body.address) {
    const createdAddress = await Address.create({
      addressLine1: body.address.addressLine1,
      addressLine2: body.address.addressLine2 || '',
      district: body.address.district,
      city: body.address.city,
      state: body.address.state,
      pincode: body.address.pincode,
      country: body.address.country || 'India',
    });
    addressId = createdAddress._id;
  }

  // ── 2. Create emergency contacts ──────────────────────────────────────────
  const emergencyContactIds = [];
  if (body.emergencyContacts && body.emergencyContacts.length) {
    for (const ec of body.emergencyContacts) {
      // Each emergency contact may carry its own address fields
      let ecAddressId;
      if (ec.address) {
        const ecAddr = await Address.create({
          addressLine1: ec.address.addressLine1,
          addressLine2: ec.address.addressLine2 || '',
          district: ec.address.district,
          city: ec.address.city,
          state: ec.address.state,
          pincode: ec.address.pincode,
          country: ec.address.country || 'India',
        });
        ecAddressId = ecAddr._id;
      }

      const created = await EmergencyContact.create({
        contactName: ec.contactName,
        phone: ec.phone,
        relationship: ec.relationship,
        address: ecAddressId,
      });
      emergencyContactIds.push(created._id);
    }
  }

  // ── 3. Create Contractor job-item documents ────────────────────────────────
  // The UI allows multiple job items per region (headquarters / northRegion).
  // Accept either:
  //   body.jobItems = [ { jobItems, unit, price, region }, ... ]
  // or the legacy single object form.
  const jobItemIds = [];
  const rawJobItems = Array.isArray(body.jobItems)
    ? body.jobItems
    : body.jobItems
    ? [body.jobItems]
    : [];

  for (const item of rawJobItems) {
    const created = await Contractor.create({
      jobItems: item.jobItems,
      unit: item.unit,
      price: item.price || 0,
      region: item.region,
    });
    jobItemIds.push(created._id);
  }

  // ── 4. Resolve contractor ID ───────────────────────────────────────────────
  let contractorId = getPending(CTR_ID_KEY);
  if (!contractorId) {
    contractorId = await allocateNextNumber('contractor') || generateContractorIdCode();
  }

  // ── 5. Build and save the User document ───────────────────────────────────
  const userData = {
    // Personal information
    name: body.name,
    email: body.email,
    password: body.password,
    phone: body.phone,
    role: 'contractor',
    gender: body.gender,
    dateOfBirth: body.dateOfBirth,
    age: body.age,
    motherTongue: body.motherTongue,
    religion: body.religion,
    identificationMark: body.identificationMark,
    profilePic: body.profilePic,
    documentNo: body.documentNo,

    // Linked sub-documents
    employeeId: contractorId,
    address: addressId ? [addressId] : [],
    emergencyContact: emergencyContactIds,

    // Work & job information
    workInformation: {
      companyName: body.workInformation?.companyName,
      specialty: body.workInformation?.specialty,
      LicenseNo: body.workInformation?.LicenseNo,
      dateOfJoining: body.workInformation?.dateOfJoining,
      branch: body.workInformation?.branch,
      reportingPerson: body.workInformation?.reportingPerson,
      designation: 'contractor',
      jobItems: jobItemIds,
    },
  };

  const user = await User.create(userData);
  clearPending(CTR_ID_KEY);
  return user;
};

// ─── Standard CRUD ───────────────────────────────────────────────────────────

/**
 * Query contractors (role = 'contractor') with pagination
 * @param {Object} filter
 * @param {Object} options
 * @returns {Promise<QueryResult>}
 */
const queryContractors = async (filter, options) => {
  const contractorFilter = { ...filter, role: 'contractor' };
  const result = await User.paginate(contractorFilter, options);

  // Populate address, emergency contacts, and job items
  await User.populate(result.results, [
    { path: 'address' },
    { path: 'emergencyContact' },
    { path: 'workInformation.jobItems', select: 'jobItems unit price region' },
  ]);

  // Populate branch and reportingPerson only when they are valid ObjectIds
  for (const doc of result.results) {
    if (doc.workInformation?.branch && isObjectId(doc.workInformation.branch)) {
      await mongoose.model('Branch').populate(doc, { path: 'workInformation.branch', select: 'branchName' });
    }
    if (doc.workInformation?.reportingPerson && isObjectId(doc.workInformation.reportingPerson)) {
      await mongoose.model('User').populate(doc, {
        path: 'workInformation.reportingPerson',
        select: 'name employeeId email',
      });
    }
  }

  return result;
};

/**
 * Get contractor by MongoDB _id OR employeeId (e.g. CTR-258540)
 * Appends financial summary: totalEarned, payOut, outstanding (all default 0
 * until a payment module is implemented).
 * @param {string} id
 * @returns {Promise<Object>}
 */
const getContractorById = async (id) => {
  // Accept both MongoDB ObjectId and human-readable employeeId
  const query = isObjectId(id.trim())
    ? { _id: id.trim(), role: 'contractor' }
    : { employeeId: id.trim(), role: 'contractor' };

  const contractor = await User.findOne(query)
    .populate('address')
    .populate('emergencyContact')
    .populate('userDocuments')
    .populate({ path: 'workInformation.jobItems', select: 'jobItems unit price region' })
    .populate('workInformation.bankDetails');

  if (!contractor) return null;

  if (contractor.workInformation?.branch && isObjectId(contractor.workInformation.branch)) {
    await mongoose.model('Branch').populate(contractor, {
      path: 'workInformation.branch',
      select: 'branchName',
    });
  }
  if (
    contractor.workInformation?.reportingPerson &&
    isObjectId(contractor.workInformation.reportingPerson)
  ) {
    await mongoose.model('User').populate(contractor, {
      path: 'workInformation.reportingPerson',
      select: 'name employeeId email',
    });
  }

  // ── Financial summary ────────────────────────────────────────────────────
  // totalEarned  — sum of all approved/completed log-work grandTotals
  // payOut       — amount already paid to the contractor
  // outstanding  — totalEarned - payOut
  //
  // Payment module not yet implemented — default all to 0 for now.
  const financialSummary = {
    totalEarned: 0,
    payOut: 0,
    outstanding: 0,
  };

  // ── Log work entries for this contractor ──────────────────────────────────
  const rawLogWork = await LogWork.find({ contractorId: contractor._id })
    .sort({ workDoneDate: -1 })
    .lean();

  // Manually populate branch and contractorJobItem only for valid ObjectIds
  const logWorkEntries = await Promise.all(
    rawLogWork.map(async (log) => {
      // Populate branch
      if (log.branch && isObjectId(String(log.branch))) {
        const branchDoc = await mongoose.model('Branch').findById(log.branch).select('branchName').lean();
        log.branch = branchDoc || log.branch;
      }
      // Populate each job item's contractorJobItem
      if (log.jobItems && log.jobItems.length) {
        log.jobItems = await Promise.all(
          log.jobItems.map(async (item) => {
            if (item.contractorJobItem && isObjectId(String(item.contractorJobItem))) {
              const jobDoc = await mongoose.model('Contractor')
                .findById(item.contractorJobItem)
                .select('jobItems unit price region')
                .lean();
              return { ...item, contractorJobItem: jobDoc || item.contractorJobItem };
            }
            return item;
          })
        );
      }
      return log;
    })
  );

  // Convert mongoose doc to plain object and merge summary + log work
  const contractorObj = contractor.toJSON();
  return { ...contractorObj, ...financialSummary, logWork: logWorkEntries };
};

/**
 * Update contractor by ID
 * @param {ObjectId} contractorId
 * @param {Object} updateBody
 * @returns {Promise<Object>}
 */
const updateContractorById = async (contractorId, updateBody) => {
  // Fetch as a raw mongoose doc (not the enriched plain object) for .save()
  const query = isObjectId(contractorId.trim())
    ? { _id: contractorId.trim(), role: 'contractor' }
    : { employeeId: contractorId.trim(), role: 'contractor' };

  const contractor = await User.findOne(query);
  if (!contractor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Contractor not found');
  }
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, contractor._id))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  Object.assign(contractor, updateBody);
  await contractor.save();
  // Return the enriched response with financial summary
  return getContractorById(contractorId);
};

/**
 * Delete contractor by ID
 * @param {ObjectId} contractorId
 * @returns {Promise<User>}
 */
const deleteContractorById = async (contractorId) => {
  const query = isObjectId(contractorId.trim())
    ? { _id: contractorId.trim(), role: 'contractor' }
    : { employeeId: contractorId.trim(), role: 'contractor' };

  const contractor = await User.findOne(query);
  if (!contractor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Contractor not found');
  }
  contractor.isDeleted = true;
  contractor.deletedAt = new Date();
  await contractor.save();
  return contractor;
};

const getContractorWorkers = async (contractorId, filter = {}, options = {}) => {
  const contractor = await User.findOne({ _id: contractorId, role: 'contractor' });
  if (!contractor) throw new ApiError(404, 'Contractor not found');
  const date = filter.date ? new Date(filter.date) : new Date();
  const assignments = await ContractorWorkerAssignment.find({ contractorId, effectiveFrom: { $lte: date }, $or: [{ effectiveTo: null }, { effectiveTo: { $gte: date } }] }).lean();
  const workerIds = assignments.map((a) => a.workerId);
  const userFilter = { _id: { $in: workerIds }, isDeleted: { $ne: true } };
  if (filter.role) userFilter.role = filter.role;
  if (filter.search) userFilter.$or = [{ name: { $regex: filter.search, $options: 'i' } }, { employeeId: { $regex: filter.search, $options: 'i' } }];
  const limit = Number(options.limit) || 10; const page = Number(options.page) || 1; const totalResults = await User.countDocuments(userFilter); const results = await User.find(userFilter).select('name employeeId role isActive workInformation').skip((page - 1) * limit).limit(limit).lean();
  return { results, page, limit, totalResults, totalPages: Math.ceil(totalResults / limit) };
};

module.exports = {
  generateContractorId,
  registerContractor,
  queryContractors,
  getContractorById,
  updateContractorById,
  deleteContractorById,
  getContractorWorkers,
};
