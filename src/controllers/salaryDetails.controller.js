const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { salaryDetailsService } = require('../services');

const createSalaryDetails = catchAsync(async (req, res) => {
  const salaryDetails = await salaryDetailsService.createSalaryDetails(req.body);
  res.status(httpStatus.CREATED).send(salaryDetails);
});

const getSalaryDetails = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['basicSalary', 'annualCTC', 'monthlyCTC']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await salaryDetailsService.querySalaryDetails(filter, options);
  res.send(result);
});

const getSalaryDetail = catchAsync(async (req, res) => {
  const salaryDetails = await salaryDetailsService.getSalaryDetailsById(req.params.salaryId);
  if (!salaryDetails) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Salary details not found');
  }
  res.send(salaryDetails);
});

const updateSalaryDetails = catchAsync(async (req, res) => {
  const salaryDetails = await salaryDetailsService.updateSalaryDetailsById(req.params.salaryId, req.body);
  res.send(salaryDetails);
});

const deleteSalaryDetails = catchAsync(async (req, res) => {
  await salaryDetailsService.deleteSalaryDetailsById(req.params.salaryId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createSalaryDetails,
  getSalaryDetails,
  getSalaryDetail,
  updateSalaryDetails,
  deleteSalaryDetails,
};
