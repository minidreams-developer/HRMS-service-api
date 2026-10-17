const httpStatus = require('http-status');
const mongoose = require('mongoose');
const Adjustment = require('../models/adjustment.model');
const { User, Payroll, PayrollPeriod, EmiInstallment } = require('../models');
const ApiError = require('../utils/ApiError');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const populateAdjustment = (query) =>
  query
    .populate('employeeId', 'name employeeId profilePic workInformation.designation workInformation.department')
    .populate('teamId', 'teamName teamCode teamLead')
    .populate('departmentId', 'departmentName')
    .populate('createdBy', 'name employeeId');

const monthIndex = (month, year) => (year * 12) + month - 1;
const monthsBetweenInclusive = (from, to) => monthIndex(to.month, to.year) - monthIndex(from.month, from.year) + 1;
const buildInstallments = (amount, totalMonths, from) => {
  const base = Math.floor((Number(amount) / totalMonths) * 100) / 100;
  const finalAmount = Number((Number(amount) - (base * (totalMonths - 1))).toFixed(2));
  return Array.from({ length: totalMonths }, (_, index) => {
    const absolute = monthIndex(from.month, from.year) + index;
    return { month: (absolute % 12) + 1, year: Math.floor(absolute / 12), installmentNumber: index + 1, installmentAmount: index === totalMonths - 1 ? finalAmount : base };
  });
};

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
  if (await PayrollPeriod.exists({ month: body.payrollMonth, year: body.payrollYear, status: 'finalized' })) {
    throw new ApiError(httpStatus.CONFLICT, 'Cannot create an adjustment for a finalized payroll period');
  }
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

  if (body.component === 'emi') {
    const from = body.emiDetails?.affectFrom;
    const to = body.emiDetails?.affectTo;
    const totalMonths = Number(body.emiDetails?.totalMonths);
    if (!from || !to || !Number.isInteger(totalMonths) || totalMonths < 1) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'EMI affectFrom, affectTo, and totalMonths are required');
    }
    if (monthsBetweenInclusive(from, to) !== totalMonths) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'EMI totalMonths must match the inclusive affectFrom/affectTo range');
    }
    data.emiDetails = { ...body.emiDetails, perMonthDeduction: Number((Number(body.amount) / totalMonths).toFixed(2)) };
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
    if (!['employee', 'staff'].includes(emp.role)) throw new ApiError(httpStatus.BAD_REQUEST, 'Adjustments support employee and staff users only');

    data.employeeId = emp._id;
    const adj = await Adjustment.create(data);
    if (body.component === 'emi') {
      await EmiInstallment.insertMany(buildInstallments(body.amount, body.emiDetails.totalMonths, body.emiDetails.affectFrom).map((item) => ({ ...item, parentAdjustmentId: adj._id, employeeId: emp._id })));
    }
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
      if (body.component === 'emi') throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot create team EMI without team members');
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
      forWhom: 'individual',
      employeeId: memberId,
      teamId: team._id,
      departmentId: body.departmentId || team.department,
    }));

    const created = await Adjustment.insertMany(records);
    if (body.component === 'emi') {
      const installments = created.flatMap((record) => buildInstallments(body.amount, body.emiDetails.totalMonths, body.emiDetails.affectFrom).map((item) => ({ ...item, parentAdjustmentId: record._id, employeeId: record.employeeId })));
      await EmiInstallment.insertMany(installments);
    }
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
    populate: 'employeeId,teamId,teamId.teamLead,departmentId,createdBy',
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
const updateAdjustmentStatus = async (id, status, actorId = null) => {
  const adj = await Adjustment.findById(id);
  if (!adj) throw new ApiError(httpStatus.NOT_FOUND, 'Adjustment not found');

  const allowed = ['draft', 'pending', 'approved', 'rejected', 'canceled', 'applied'];
  if (!allowed.includes(status)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid status: ${status}`);
  }

  if (status === 'applied') {
    if (adj.status !== 'approved') throw new ApiError(httpStatus.BAD_REQUEST, 'Only approved adjustments can be applied');
    if (!adj.appliedToPayroll) throw new ApiError(httpStatus.BAD_REQUEST, 'This adjustment is not configured for payroll application');
    await applyAdjustmentToPayroll(adj);
    adj.status = 'applied';
    adj.appliedBy = actorId;
    adj.appliedAt = new Date();
  } else if (status === 'approved') {
    if (adj.status !== 'pending') throw new ApiError(httpStatus.BAD_REQUEST, 'Only pending adjustments can be approved');
    adj.status = 'approved';
    adj.approvedBy = actorId;
    adj.approvedAt = new Date();
  } else if (['rejected', 'canceled'].includes(status)) {
    if (!['draft', 'pending', 'approved'].includes(adj.status)) throw new ApiError(httpStatus.BAD_REQUEST, `Cannot change adjustment with status "${adj.status}"`);
    adj.status = status;
    adj.cancelledBy = actorId;
    adj.cancelledAt = new Date();
  } else {
    adj.status = status;
  }

  if (status === 'canceled' && adj.component === 'emi') {
    await EmiInstallment.updateMany(
      { parentAdjustmentId: adj._id, status: 'pending' },
      { $set: { status: 'cancelled', cancelledAt: new Date() } }
    );
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
  if (adj.component === 'emi') {
    const installment = await EmiInstallment.findOne({ parentAdjustmentId: adj._id, month: adj.payrollMonth, year: adj.payrollYear, status: 'pending' });
    if (!installment) return;
    const appliedInstallment = await applyEmiInstallment(installment);
    adj.payrollId = appliedInstallment?.payrollId || null;
    return;
  }
  if (await PayrollPeriod.exists({ month: adj.payrollMonth, year: adj.payrollYear, status: 'finalized' })) {
    throw new ApiError(httpStatus.CONFLICT, 'Cannot apply an adjustment to a finalized payroll period');
  }
  const field = adj.type === 'addition'
    ? (['bonus', 'incentive'].includes(adj.component) ? 'extras' : 'otherWages')
    : (adj.component === 'advance' || adj.component === 'emi' ? 'loanAndAdvance' : (adj.component === 'penalty' ? 'penalties' : 'otherDeductions'));
  const payroll = await Payroll.findOne({ employeeId: adj.employeeId, month: adj.payrollMonth, year: adj.payrollYear });
  if (payroll && ['paid', 'stopped'].includes(payroll.status)) throw new ApiError(httpStatus.CONFLICT, `Cannot apply adjustment to ${payroll.status} payroll`);

  const updated = await Payroll.findOneAndUpdate(
    { employeeId: adj.employeeId, month: adj.payrollMonth, year: adj.payrollYear },
    { $inc: { [field]: adj.amount } }, { upsert: true, new: true }
  );
  adj.payrollId = updated._id;
};

const applyEmiInstallment = async (installment, now = new Date()) => {
  if (await PayrollPeriod.exists({ month: installment.month, year: installment.year, status: 'finalized' })) {
    throw new ApiError(httpStatus.CONFLICT, 'Cannot apply an EMI installment to a finalized payroll period');
  }
  const payroll = await Payroll.findOne({ employeeId: installment.employeeId, month: installment.month, year: installment.year });
  if (payroll && ['paid', 'stopped'].includes(payroll.status)) {
    throw new ApiError(httpStatus.CONFLICT, `Cannot apply EMI installment to ${payroll.status} payroll`);
  }
  const updatedPayroll = await Payroll.findOneAndUpdate(
    { employeeId: installment.employeeId, month: installment.month, year: installment.year },
    { $inc: { loanAndAdvance: installment.installmentAmount } }, { upsert: true, new: true }
  );
  return EmiInstallment.findOneAndUpdate(
    { _id: installment._id, status: 'pending' },
    { $set: { status: 'applied', payrollId: updatedPayroll._id, appliedAt: now } }, { new: true }
  );
};

const processDueEmiInstallments = async ({ month, year }) => {
  const due = await EmiInstallment.find({ month, year, status: 'pending' }).populate('parentAdjustmentId').lean();
  let applied = 0;
  for (const installment of due) {
    const parent = installment.parentAdjustmentId;
    if (!parent || !['approved', 'applied'].includes(parent.status)) continue;
    if (parent.status === 'approved') continue;
    if (await applyEmiInstallment(installment)) applied += 1;
  }
  return { matched: due.length, applied };
};

const getEmiSchedule = async (id) => {
  const adjustment = await Adjustment.findById(id).lean();
  if (!adjustment) return null;
  const installments = await EmiInstallment.find({ parentAdjustmentId: id }).sort({ installmentNumber: 1 }).lean();
  return { parentAdjustmentId: adjustment._id, amount: adjustment.amount, totalMonths: adjustment.emiDetails?.totalMonths || 0, perMonthDeduction: adjustment.emiDetails?.perMonthDeduction || null, installments };
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
  if (await PayrollPeriod.exists({ month: updateBody.payrollMonth || adj.payrollMonth, year: updateBody.payrollYear || adj.payrollYear, status: 'finalized' })) {
    throw new ApiError(httpStatus.CONFLICT, 'Cannot edit an adjustment for a finalized payroll period');
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
  if (adj.status === 'applied') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Applied adjustment cannot be deleted');
  }
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
  getEmiSchedule,
  processDueEmiInstallments,
};
