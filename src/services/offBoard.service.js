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
 * Query offboard records
 * @param {Object} filter
 * @param {Object} options
 * @returns {Promise<QueryResult>}
 */
const queryOffBoards = async (filter, options) => {
  const safeFilter = {};
  if (filter.userId && mongoose.Types.ObjectId.isValid(filter.userId)) {
    safeFilter.userId = filter.userId;
  }

  const limit = Number(options.limit) || 10;
  const page = Number(options.page) || 1;

  const offBoards = await OffBoard.find(safeFilter)
    .populate('userId', 'name email employeeId')
    .populate('userDocuments')
    .sort(options.sortBy || '-createdAt')
    .limit(limit)
    .skip((page - 1) * limit);

  // exitApprovedBy is Mixed — only populate records where it's a valid ObjectId
  for (const record of offBoards) {
    if (
      record.exitInformation?.exitApprovedBy &&
      mongoose.Types.ObjectId.isValid(record.exitInformation.exitApprovedBy)
    ) {
      await record.populate('exitInformation.exitApprovedBy', 'name email');
    }
  }

  const total = await OffBoard.countDocuments(safeFilter);

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
