const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { OffBoard, User, Asset } = require('../models');
const ApiError = require('../utils/ApiError');
const tokenService = require('./token.service');
const emailService = require('./email.service');

/**
 * Create an offboard record
 * @param {Object} body
 * @returns {Promise<OffBoard>}
 */
const createOffBoard = async (body, actorId) => {
  const user = await User.findById(body.userId).lean();
  if (!user || user.isDeleted) throw new ApiError(httpStatus.BAD_REQUEST, 'User not found or deleted');
  if (!['employee', 'staff', 'agent'].includes(user.role)) throw new ApiError(httpStatus.BAD_REQUEST, 'Offboarding is not supported for this User role');
  if (user.isActive === 'Relieved') throw new ApiError(httpStatus.CONFLICT, 'User is already Relieved');
  const active = await OffBoard.exists({ userId: body.userId, status: { $in: ['draft', 'pendingApproval', 'approved'] }, isDeleted: { $ne: true } });
  if (active) throw new ApiError(httpStatus.CONFLICT, 'Active OffBoard record already exists for this User');
  const info = body.exitInformation || {};
  const resignationDate = info.resignationSubmitionDate || info.resignationSubmissionDate;
  if (resignationDate && info.lastWorkingDate && new Date(info.lastWorkingDate) < new Date(resignationDate)) throw new ApiError(httpStatus.BAD_REQUEST, 'lastWorkingDate cannot be before resignation date');
  if (info.resignationSubmissionDate && !info.resignationSubmitionDate) info.resignationSubmitionDate = info.resignationSubmissionDate;
  return OffBoard.create({ ...body, status: 'pendingApproval', createdBy: actorId });
};

/**
 * Query offboard records with search and filter support.
 *
 * Filter keys:
 *   userId          — exact ObjectId match
 *   search          — regex across linked user's name, email, employeeId
 *   exitType        — case-insensitive match on exitInformation.exitType
 *   lastWorkingFrom — exitInformation.lastWorkingDate >= date
 *   lastWorkingTo   — exitInformation.lastWorkingDate <= date
 *
 * @param {Object} filter
 * @param {Object} options - sortBy, limit, page
 * @returns {Promise<QueryResult>}
 */
const queryOffBoards = async (filter, options) => {
  const mongoFilter = {};

  // userId filter
  if (filter.userId && mongoose.Types.ObjectId.isValid(filter.userId)) {
    mongoFilter.userId = filter.userId;
  }

  // Search — find matching users first, then scope to their IDs
  if (filter.search) {
    const regex = { $regex: filter.search, $options: 'i' };
    const matchedUsers = await User.find(
      { $or: [{ name: regex }, { email: regex }, { employeeId: regex }] },
      { _id: 1 }
    ).lean();
    const userIds = matchedUsers.map((u) => u._id);
    // Intersect with existing userId filter if present
    mongoFilter.userId = mongoFilter.userId
      ? { $in: userIds.filter((id) => id.toString() === mongoFilter.userId.toString()) }
      : { $in: userIds };
  }

  // Exit type filter
  if (filter.exitType) {
    mongoFilter['exitInformation.exitType'] = { $regex: filter.exitType, $options: 'i' };
  }
  if (filter.status) mongoFilter.status = filter.status;

  if (filter.role || filter.departmentId) {
    const userFilter = {};
    if (filter.role) userFilter.role = filter.role;
    if (filter.departmentId) {
      const departmentValues = [filter.departmentId];
      if (mongoose.Types.ObjectId.isValid(filter.departmentId)) departmentValues.push(new mongoose.Types.ObjectId(filter.departmentId));
      userFilter['workInformation.department'] = { $in: departmentValues };
    }
    const users = await User.find(userFilter, { _id: 1 }).lean();
    mongoFilter.userId = { $in: users.map((user) => user._id) };
  }

  // Last working date range
  if (filter.lastWorkingFrom || filter.lastWorkingTo) {
    mongoFilter['exitInformation.lastWorkingDate'] = {};
    if (filter.lastWorkingFrom) {
      mongoFilter['exitInformation.lastWorkingDate'].$gte = new Date(filter.lastWorkingFrom);
    }
    if (filter.lastWorkingTo) {
      const end = new Date(filter.lastWorkingTo);
      end.setUTCHours(23, 59, 59, 999);
      mongoFilter['exitInformation.lastWorkingDate'].$lte = end;
    }
  }

  const limit = Number(options.limit) || 10;
  const page  = Number(options.page)  || 1;

  const [offBoards, total] = await Promise.all([
    OffBoard.find(mongoFilter)
      .populate('userId', 'name email employeeId')
      .populate('userDocuments')
      .sort(options.sortBy ? options.sortBy.replace(':', ' ') : '-createdAt')
      .limit(limit)
      .skip((page - 1) * limit),
    OffBoard.countDocuments(mongoFilter),
  ]);

  // exitApprovedBy is Mixed — only populate where it's a valid ObjectId
  for (const record of offBoards) {
    if (
      record.exitInformation?.exitApprovedBy &&
      mongoose.Types.ObjectId.isValid(record.exitInformation.exitApprovedBy)
    ) {
      await record.populate('exitInformation.exitApprovedBy', 'name email');
    }
  }

  return {
    results: offBoards,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    totalResults: total,
  };
};

/**
 * Return the summary cards used by the offboarding dashboard.
 *
 * Definitions:
 * - inProgress: draft, pending approval, or approved records
 * - pendingClearance: approved records awaiting the last working date/finalization
 * - fnfPending: approved/relieved records with at least one incomplete settlement item
 * - completed: relieved records
 * - avgExitTime: average calendar days from resignation submission to relief
 */
const getOffBoardSummary = async (filter = {}) => {
  const mongoFilter = { isDeleted: { $ne: true } };
  if (filter.exitType) mongoFilter['exitInformation.exitType'] = { $regex: filter.exitType, $options: 'i' };
  if (filter.status) mongoFilter.status = filter.status;
  if (filter.range) {
    const from = new Date();
    from.setDate(from.getDate() - Number(filter.range));
    mongoFilter.createdAt = { $gte: from };
  }
  if (filter.role || filter.departmentId) {
    const userFilter = {};
    if (filter.role) userFilter.role = filter.role;
    if (filter.departmentId) {
      const departmentValues = [filter.departmentId];
      if (mongoose.Types.ObjectId.isValid(filter.departmentId)) departmentValues.push(new mongoose.Types.ObjectId(filter.departmentId));
      userFilter['workInformation.department'] = { $in: departmentValues };
    }
    const users = await User.find(userFilter, { _id: 1 }).lean();
    mongoFilter.userId = { $in: users.map((user) => user._id) };
  }

  const records = await OffBoard.find(mongoFilter)
    .select('status exitInformation finalSettlemelastMonthSalary updatedAt')
    .lean();

  const settlementFields = [
    'lastMonthSalary', 'pendingSalary', 'leaveEncashment', 'bonus_incentives',
    'reimbursements', 'noticePay', 'assetDamge', 'loanRecovery',
    'advanceSalary', 'taxAdjustments', 'tenth_marksheet', 'twelevth_marksheet',
  ];
  const isSettlementComplete = (record) => settlementFields.every(
    (field) => record.finalSettlemelastMonthSalary?.[field] === true
  );

  const inProgress = records.filter((r) => ['draft', 'pendingApproval', 'approved'].includes(r.status)).length;
  const pendingClearance = records.filter((r) => r.status === 'approved').length;
  const fnfPending = records.filter(
    (r) => ['approved', 'relieved'].includes(r.status) && !isSettlementComplete(r)
  ).length;
  const completed = records.filter((r) => r.status === 'relieved').length;

  const exitDurations = records
    .filter((r) => r.status === 'relieved')
    .map((r) => {
      const start = new Date(r.exitInformation?.resignationSubmitionDate);
      const end = new Date(r.updatedAt);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
      return Math.max(0, Math.round((end - start) / (24 * 60 * 60 * 1000)));
    })
    .filter((value) => value !== null);

  return {
    inProgress,
    pendingClearance,
    fnfPending,
    completed,
    avgExitTime: exitDurations.length
      ? Math.round((exitDurations.reduce((sum, value) => sum + value, 0) / exitDurations.length) * 10) / 10
      : 0,
    avgExitTimeUnit: 'days',
    totalRecords: records.length,
  };
};

/**
 * Get offboard record by id
 * @param {ObjectId} id
 * @returns {Promise<OffBoard>}
 */
const getOffBoardById = async (id) => {
  const record = await OffBoard.findById(id)
    .populate('userId', 'name email employeeId role workInformation assets assetDetails')
    .populate('userDocuments');

  let assetDetails = [];
  if (record?.userId) {
    await record.populate([
      { path: 'userId.workInformation.department', select: 'departmentName departmentCode departmentDescription branchId' },
      { path: 'userId.workInformation.team', select: 'teamName teamCode teamDescription department' },
      { path: 'userId.workInformation.reportingPerson', select: 'name email employeeId role' },
      { path: 'userId.workInformation.designationId', select: 'name code description' },
      { path: 'userId.workInformation.shiftId', select: 'shiftName shiftCode shiftType timings weekOff minWorkingHours halfDayWorkingHours overtimeAfterHours' },
    ]);
    assetDetails = await Asset.find({ assignedTo: record.userId._id }).lean();
  }

  if (record?.exitInformation?.exitApprovedBy &&
    mongoose.Types.ObjectId.isValid(record.exitInformation.exitApprovedBy)) {
    await record.populate('exitInformation.exitApprovedBy', 'name email');
  }

  if (!record) return record;
  return { ...record.toObject(), assetDetails };
};

/**
 * Get offboard record by userId
 * @param {ObjectId} userId
 * @returns {Promise<OffBoard>}
 */
const getOffBoardByUserId = async (userId) => {
  const records = await OffBoard.find({ userId })
    .sort({ createdAt: -1 })
    .populate('userId', 'name email employeeId')
    .populate('userDocuments');

  for (const record of records) {
    if (record?.exitInformation?.exitApprovedBy && mongoose.Types.ObjectId.isValid(record.exitInformation.exitApprovedBy)) {
      await record.populate('exitInformation.exitApprovedBy', 'name email');
    }
  }
  return records;
};

/**
 * Update offboard record by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<OffBoard>}
 */
const updateOffBoardById = async (id, updateBody) => {
  const offBoard = await OffBoard.findById(id);
  if (!offBoard) {
    throw new ApiError(httpStatus.NOT_FOUND, 'OffBoard record not found');
  }
  if (['approved', 'relieved', 'rejected', 'cancelled'].includes(offBoard.status)) throw new ApiError(httpStatus.CONFLICT, 'OffBoard record is no longer editable');
  delete updateBody.status;
  delete updateBody.userId;
  Object.assign(offBoard, updateBody);
  await offBoard.save();
  return offBoard;
};

/**
 * Delete offboard record by id
 * @param {ObjectId} id
 * @returns {Promise<OffBoard>}
 */
const deleteOffBoardById = async (id, actorId) => {
  const offBoard = await OffBoard.findById(id);
  if (!offBoard) {
    throw new ApiError(httpStatus.NOT_FOUND, 'OffBoard record not found');
  }
  if (!['draft', 'pendingApproval'].includes(offBoard.status)) throw new ApiError(httpStatus.CONFLICT, 'Only pending OffBoard records can be cancelled');
  offBoard.status = 'cancelled'; offBoard.isDeleted = true; offBoard.deletedAt = new Date(); offBoard.cancelledAt = new Date(); offBoard.deletedBy = actorId; offBoard.cancelledBy = actorId;
  await offBoard.save();
  return offBoard;
};

const updateOffBoardStatus = async (id, status, actorId, reason) => {
  const record = await OffBoard.findById(id); if (!record) throw new ApiError(httpStatus.NOT_FOUND, 'OffBoard record not found');
  const allowed = { draft: ['pendingApproval'], pendingApproval: ['approved', 'rejected'] };
  if (!allowed[record.status]?.includes(status)) throw new ApiError(httpStatus.CONFLICT, `Cannot change OffBoard status from '${record.status}' to '${status}'`);
  record.status = status;
  if (status === 'approved') { record.exitInformation = record.exitInformation || {}; record.exitInformation.exitApprovedBy = actorId; record.exitInformation.approvalDate = new Date(); }
  if (status === 'rejected') { record.rejectedBy = actorId; record.rejectedAt = new Date(); record.rejectionReason = reason; }
  return record.save();
};

const finalizeOffBoard = async (id, actorId) => {
  const record = await OffBoard.findById(id); if (!record) throw new ApiError(httpStatus.NOT_FOUND, 'OffBoard record not found');
  if (record.status !== 'approved') throw new ApiError(httpStatus.CONFLICT, 'Only approved OffBoard records can be finalized');
  const last = record.exitInformation?.lastWorkingDate ? new Date(record.exitInformation.lastWorkingDate) : null;
  if (!last || new Date() < last) throw new ApiError(httpStatus.CONFLICT, 'Last working date has not been reached');
  const user = await User.findById(record.userId); if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  user.isActive = 'Relieved'; user.workInformation = user.workInformation || {}; user.workInformation.relievedDate = new Date(); await user.save();
  record.status = 'relieved'; record.updatedBy = actorId; return record.save();
};

/**
 * Send OTP to the verificationEmail stored on the offboard record
 * @param {ObjectId} offBoardId
 * @returns {Promise<void>}
 */
const sendVerificationOtp = async (offBoardId) => {
  const offBoard = await OffBoard.findById(offBoardId);
  if (!offBoard) {
    throw new ApiError(httpStatus.NOT_FOUND, 'OffBoard record not found');
  }
  if (!offBoard.verificationEmail) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No verification email set on this offboard record');
  }
  if (offBoard.isEmailVerified) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email is already verified');
  }

  const otp = await tokenService.generateOffBoardOtp(offBoard._id);
  await emailService.sendOffBoardOtpEmail(offBoard.verificationEmail, otp);
};

/**
 * Verify OTP and mark offboard email as verified
 * @param {ObjectId} offBoardId
 * @param {string} otp
 * @returns {Promise<OffBoard>}
 */
const verifyEmailWithOtp = async (offBoardId, otp) => {
  const offBoard = await OffBoard.findById(offBoardId);
  if (!offBoard) {
    throw new ApiError(httpStatus.NOT_FOUND, 'OffBoard record not found');
  }
  if (offBoard.isEmailVerified) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email is already verified');
  }

  await tokenService.verifyOffBoardOtp(offBoard._id, otp);

  offBoard.isEmailVerified = true;
  await offBoard.save();
  return offBoard;
};

module.exports = {
  createOffBoard,
  queryOffBoards,
  getOffBoardSummary,
  getOffBoardById,
  getOffBoardByUserId,
  updateOffBoardById,
  deleteOffBoardById,
  sendVerificationOtp,
  verifyEmailWithOtp,
  updateOffBoardStatus,
  finalizeOffBoard,
};
