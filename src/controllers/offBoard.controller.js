const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { offBoardService } = require('../services');

const createOffBoard = catchAsync(async (req, res) => {
  const offBoard = await offBoardService.createOffBoard(req.body);
  res.status(httpStatus.CREATED).send(offBoard);
});

const getOffBoards = catchAsync(async (req, res) => {
  const filter  = pick(req.query, ['userId', 'search', 'exitType', 'lastWorkingFrom', 'lastWorkingTo']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result  = await offBoardService.queryOffBoards(filter, options);
  res.send(result);
});

const getOffBoard = catchAsync(async (req, res) => {
  const offBoard = await offBoardService.getOffBoardById(req.params.offBoardId);
  if (!offBoard) {
    throw new ApiError(httpStatus.NOT_FOUND, 'OffBoard record not found');
  }
  res.send(offBoard);
});

const getOffBoardByUser = catchAsync(async (req, res) => {
  const offBoard = await offBoardService.getOffBoardByUserId(req.params.userId);
  if (!offBoard) {
    throw new ApiError(httpStatus.NOT_FOUND, 'OffBoard record not found for this user');
  }
  res.send(offBoard);
});

const updateOffBoard = catchAsync(async (req, res) => {
  const offBoard = await offBoardService.updateOffBoardById(req.params.offBoardId, req.body);
  res.send(offBoard);
});

const deleteOffBoard = catchAsync(async (req, res) => {
  await offBoardService.deleteOffBoardById(req.params.offBoardId);
  res.status(httpStatus.NO_CONTENT).send();
});

const sendOtp = catchAsync(async (req, res) => {
  await offBoardService.sendVerificationOtp(req.params.offBoardId);
  res.send({ message: 'OTP sent to verification email' });
});

const verifyOtp = catchAsync(async (req, res) => {
  const offBoard = await offBoardService.verifyEmailWithOtp(req.params.offBoardId, req.body.otp);
  res.send(offBoard);
});

module.exports = {
  createOffBoard,
  getOffBoards,
  getOffBoard,
  getOffBoardByUser,
  updateOffBoard,
  deleteOffBoard,
  sendOtp,
  verifyOtp,
};
