const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { bankDetailsService } = require('../services');

const createBankDetails = catchAsync(async (req, res) => {
  const bankDetails = await bankDetailsService.createBankDetails(req.body);
  res.status(httpStatus.CREATED).send(bankDetails);
});

const getBankDetails = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['userId', 'bankName', 'accountNumber']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await bankDetailsService.queryBankDetails(filter, options);
  res.send(result);
});

const getBankDetailsById = catchAsync(async (req, res) => {
  const bankDetails = await bankDetailsService.getBankDetailsById(req.params.bankDetailsId);
  if (!bankDetails) {
    throw new ApiError(httpStatus.NOT_FOUND, 'BankDetails not found');
  }
  res.send(bankDetails);
});

const updateBankDetails = catchAsync(async (req, res) => {
  const bankDetails = await bankDetailsService.updateBankDetailsById(req.params.bankDetailsId, req.body);
  res.send(bankDetails);
});

const deleteBankDetails = catchAsync(async (req, res) => {
  await bankDetailsService.deleteBankDetailsById(req.params.bankDetailsId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createBankDetails,
  getBankDetails,
  getBankDetailsById,
  updateBankDetails,
  deleteBankDetails,
};
