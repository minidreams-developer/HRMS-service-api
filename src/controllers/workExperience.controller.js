const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { workExperienceService } = require('../services');

const createWorkExperience = catchAsync(async (req, res) => {
  const workExperience = await workExperienceService.createWorkExperience(req.body);
  res.status(httpStatus.CREATED).send(workExperience);
});

const getWorkExperiences = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['userId', 'companyName', 'jobTitle']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await workExperienceService.queryWorkExperiences(filter, options);
  res.send(result);
});

const getWorkExperience = catchAsync(async (req, res) => {
  const workExperience = await workExperienceService.getWorkExperienceById(req.params.workExperienceId);
  if (!workExperience) {
    throw new ApiError(httpStatus.NOT_FOUND, 'WorkExperience not found');
  }
  res.send(workExperience);
});

const updateWorkExperience = catchAsync(async (req, res) => {
  const workExperience = await workExperienceService.updateWorkExperienceById(req.params.workExperienceId, req.body);
  res.send(workExperience);
});

const deleteWorkExperience = catchAsync(async (req, res) => {
  await workExperienceService.deleteWorkExperienceById(req.params.workExperienceId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createWorkExperience,
  getWorkExperiences,
  getWorkExperience,
  updateWorkExperience,
  deleteWorkExperience,
};
