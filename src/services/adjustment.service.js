const httpStatus = require('http-status');
const mongoose = require('mongoose');
const Adjustment = require('../models/adjustment.model');
const { User, Payroll } = require('../models');
const ApiError = require('../utils/ApiError');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const populateAdjustment = (query) =>
  query
    .populate('employeeId', 'name employeeId profilePic workInformation.designation workInformation.department')
    .populate('teamId', 'teamName teamCode teamLead')
    .populate('departmentId', 'departmentName')
    .populate('createdBy', 'name employeeId');

// ─── Quick Stats ──────────────────────────────────────────────────────────────

/**
 * Compute quick stats for the Additions & Deductions screen.
 * @param {number} month
 * @param {number} year
 */
const getQuickStats = async (month, year) => {
  const matchPeriod = { payrollMonth: month, payrollYear: year };

  const [additionsAgg, deductionsAgg, pendingCount, appliedCount] = await Promise.all([
    // Total additions amount
    Adjustment.aggregate([
      { $match: { ...matchPeriod, type: 'addition', status: { $nin: ['canceled', 'rejected'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    // Total deductions amount
    Adjustment.aggregate([
      { $match: { ...matchPeriod, type: 'deduction', status: { $nin: ['canceled', 'rejected'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    // Pending approvals count
    Adjustment.countDocuments({ ...matchPeriod, status: 'pending' }),
    // Applied to payroll count
    Adjustment.countDocuments({ ...matchPeriod, appliedToPayroll: true, status: 'applied' }),
  ]);

  return {
    totalAdditionsAmount: additionsAgg[0]?.total || 0,
    totalDeductionsAmount: deductionsAgg[0]?.total || 0,
    pendingApprovals: pendingCount,
    appliedToPayroll: appliedCount,
  };
};

// ─── Create Adjustment ────────────────────────────────────────────────────────

/**
 * Create a new adjustment (Addition or Deduction).
 * When forWhom = "team", creates one Adjustment record per team member.
 * @param {Object} body
 * @param {ObjectId} createdById
 * @returns {Promise<Adjustment|Adjustment[]>}
 */
const createAdjustment = async (body, createdById) => {
  const data = {
    forWhom: body.forWhom,
    type: body.type,
    component: body.component,
    date: body.date,
    payrollMonth: body.payrollMonth,
    payrollYear: body.payrollYear,
    amount: body.amount,
    appliedToPayroll: body.appliedToPayroll !== undefined ? body.appliedToPayroll : true,
    status: 'pending',
    createdBy: createdById,
    remarks: body.remarks,
  };

  // EMI extra fields
  if (body.component === 'emi' && body.emiDetails) {
    data.emiDetails = body.emiDetails;
  }

  if (body.forWhom === 'individual') {
    if (!body.employeeId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'employeeId is required when forWhom is "individual"');
    }

    // Accept MongoDB _id OR human-readable employeeId (EMP-XXXXXX / CTR-XXXXXX)
    const isObjectId = (val) =>
      mongoose.Types.ObjectId.isValid(val) && String(new mongoose.Types.ObjectId(val)) === String(val);

    const empQuery = isObjectId(String(body.employeeId))
      ? { _id: body.employeeId }
      : { employeeId: body.employeeId };

    const emp = await User.findOne(empQuery).lean();
    if (!emp) throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');

    data.employeeId = emp._id;
    const adj = await Adjustment.create(data);
    return populateAdjustment(Adjustment.findById(adj._id));
  }

  if (body.forWhom === 'team') {
    if (!body.teamId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'teamId is required when forWhom is "team"');
    }

    // Accept MongoDB _id OR human-readable teamCode
    const isObjectId = (val) =>
      mongoose.Types.ObjectId.isValid(val) && String(new mongoose.Types.ObjectId(val)) === String(val);

    const teamQuery = isObjectId(String(body.teamId))
      ? { _id: body.teamId }
      : { teamCode: body.teamId };

    const team = await mongoose.model('Team').findOne(teamQuery).lean();
    if (!team) throw new ApiError(httpStatus.NOT_FOUND, 'Team not found');

    // Create one adjustment per team member, or a single team-level record if no members yet
    const members = team.teamEmployees || [];

    if (!members.length) {
      // No members yet — create a single team-level record (no employeeId)
      const adj = await Adjustment.create({
        ...data,
        teamId: team._id,
        departmentId: body.departmentId || team.department,
      });
      return adj;
    }

    const records = members.map((memberId) => ({
      ...data,
      forWhom: 'person',
      employeeId: memberId,
      teamId: body.teamId,
      departmentId: body.departmentId || team.department,
    }));

    const created = await Adjustment.insertMany(records);
    return created;
  }

  throw new ApiError(httpStatus.BAD_REQUEST, 'forWhom must be "individual" or "team"');
};

// ─── Query / List ─────────────────────────────────────────────────────────────

/**
 * List adjustments with pagination and filters.
 * @param {Object} query  { month, year, status, type, search }
 * @param {Object} options { limit, page, sortBy }
 */
const queryAdjustments = async (query, options) => {
  const filter = {};

  if (query.month) filter.payrollMonth = parseInt(query.month, 10);
  if (query.year) filter.payrollYear = parseInt(query.year, 10);
  if (query.status) filter.status = query.status;
  if (query.type) filter.type = query.type;
  if (query.component) filter.component = query.component;

  // Search by employee name — resolve to employeeId first
  if (query.search) {
    const regex = new RegExp(query.search, 'i');
    const matchedUsers = await User.find({ name: regex }).select('_id').lean();
    filter.employeeId = { $in: matchedUsers.map((u) => u._id) };
  }

  const result = await Adjustment.paginate(filter, {
    ...options,
    populate: 'employeeId,teamId,departmentId,createdBy',
    sort: options.sortBy || '-createdAt',
  });

  return result;
};

// ─── Get by ID ────────────────────────────────────────────────────────────────

/**
 * Get a single adjustment by its _id.
 * @param {string} id
 * @returns {Promise<Adjustment>}
 */
const getAdjustmentById = async (id) => {
  return populateAdjustment(Adjustment.findById(id));
};

// ─── Update Status (Approve / Reject / Cancel) ────────────────────────────────

/**
 * Update the status of an adjustment.
 * approve → approved, reject → rejected, cancel → canceled
 * @param {string} id
 * @param {string} status
 * @returns {Promise<Adjustment>}
 */
const updateAdjustmentStatus = async (id, status) => {
  const adj = await Adjustment.findById(id);
  if (!adj) throw new ApiError(httpStatus.NOT_FOUND, 'Adjustment not found');

  const allowed = ['draft', 'pending', 'approved', 'rejected', 'canceled', 'applied'];
  if (!allowed.includes(status)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid status: ${status}`);
  }

  adj.status = status;

  // When approved + appliedToPayroll = true → apply it to the payroll record
  if (status === 'approved' && adj.appliedToPayroll) {
    await applyAdjustmentToPayroll(adj);
    adj.status = 'applied';
  }

  await adj.save();
  return populateAdjustment(Adjustment.findById(adj._id));
};

/**
 * Apply the adjustment amount to the corresponding Payroll document.
 * Increments additions or deductions fields.
 * @param {Adjustment} adj
 */
const applyAdjustmentToPayroll = async (adj) => {
  if (!adj.employeeId) return;

  const field = adj.type === 'addition' ? 'additionPayment' : 'deductions';

  await Payroll.findOneAndUpdate(
    { employeeId: adj.employeeId, month: adj.payrollMonth, year: adj.payrollYear },
    { $inc: { [field]: adj.amount } },
    { upsert: true }
  );
};

// ─── Update Adjustment ────────────────────────────────────────────────────────

/**
 * Update editable fields of an adjustment (only when status is draft or pending).
 * @param {string} id
 * @param {Object} updateBody
 */
const updateAdjustmentById = async (id, updateBody) => {
  const adj = await Adjustment.findById(id);
  if (!adj) throw new ApiError(httpStatus.NOT_FOUND, 'Adjustment not found');

  if (!['draft', 'pending'].includes(adj.status)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Cannot edit adjustment with status "${adj.status}"`);
  }

  const editableFields = [
    'type', 'component', 'date', 'payrollMonth', 'payrollYear',
    'amount', 'appliedToPayroll', 'emiDetails', 'remarks',
  ];
  for (const field of editableFields) {
    if (updateBody[field] !== undefined) {
      adj[field] = updateBody[field];
    }
  }

  await adj.save();
  return populateAdjustment(Adjustment.findById(adj._id));
};

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Delete an adjustment by its _id.
 * @param {string} id
 */
const deleteAdjustmentById = async (id) => {
  const adj = await Adjustment.findById(id);
  if (!adj) throw new ApiError(httpStatus.NOT_FOUND, 'Adjustment not found');
  await adj.deleteOne();
  return adj;
};

module.exports = {
  getQuickStats,
  createAdjustment,
  queryAdjustments,
  getAdjustmentById,
  updateAdjustmentStatus,
  updateAdjustmentById,
  deleteAdjustmentById,
};
