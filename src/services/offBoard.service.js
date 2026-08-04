const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { OffBoard } = require('../models');
const ApiError = require('../utils/ApiError');
const tokenService = require('./token.service');
const emailService = require('./email.service');

/**
 * Create an offboard record
 * @param {Object} body
 * @returns {Promise<OffBoard>}
 */
const createOffBoard = async (body) => {
  return OffBoard.create(body);
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
  const { User } = require('../models');
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
 * Get offboard record by id
 * @param {ObjectId} id
 * @returns {Promise<OffBoard>}
 */
const getOffBoardById = async (id) => {
  const record = await OffBoard.findById(id)
    .populate('userId', 'name email employeeId')
    .populate('userDocuments');

  if (record?.exitInformation?.exitApprovedBy &&
    mongoose.Types.ObjectId.isValid(record.exitInformation.exitApprovedBy)) {
    await record.populate('exitInformation.exitApprovedBy', 'name email');
  }

  return record;
};

/**
 * Get offboard record by userId
 * @param {ObjectId} userId
 * @returns {Promise<OffBoard>}
 */
const getOffBoardByUserId = async (userId) => {
  const record = await OffBoard.findOne({ userId })
    .populate('userId', 'name email employeeId')
    .populate('userDocuments');

  if (record?.exitInformation?.exitApprovedBy &&
    mongoose.Types.ObjectId.isValid(record.exitInformation.exitApprovedBy)) {
    await record.populate('exitInformation.exitApprovedBy', 'name email');
  }

  return record;
};

/**
 * Update offboard record by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<OffBoard>}
 */
const updateOffBoardById = async (id, updateBody) => {
  const offBoard = await getOffBoardById(id);
  if (!offBoard) {
    throw new ApiError(httpStatus.NOT_FOUND, 'OffBoard record not found');
  }
  Object.assign(offBoard, updateBody);
  await offBoard.save();
  return offBoard;
};

/**
 * Delete offboard record by id
 * @param {ObjectId} id
 * @returns {Promise<OffBoard>}
 */
const deleteOffBoardById = async (id) => {
  const offBoard = await getOffBoardById(id);
  if (!offBoard) {
    throw new ApiError(httpStatus.NOT_FOUND, 'OffBoard record not found');
  }
  await offBoard.deleteOne();
  return offBoard;
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
  getOffBoardById,
  getOffBoardByUserId,
  updateOffBoardById,
  deleteOffBoardById,
  sendVerificationOtp,
  verifyEmailWithOtp,
};
