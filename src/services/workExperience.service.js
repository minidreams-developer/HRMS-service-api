const httpStatus = require("http-status");
const { WorkExperience } = require("../models");
const ApiError = require("../utils/ApiError");

/**
 * Create a workExperience
 * @param {Object} body
 * @returns {Promise<WorkExperience>}
 */
const createWorkExperience = async (body) => {
  return WorkExperience.create(body);
};

/**
 * Query for workExperiences
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryWorkExperiences = async (filter, options) => {
  const workExperiences = await WorkExperience.paginate(filter, options);
  return workExperiences;
};

/**
 * Get workExperience by id
 * @param {ObjectId} id
 * @returns {Promise<WorkExperience>}
 */
const getWorkExperienceById = async (id) => {
  return WorkExperience.findById(id);
};

/**
 * Update workExperience by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<WorkExperience>}
 */
const updateWorkExperienceById = async (id, updateBody) => {
  const workExperience = await getWorkExperienceById(id);
  if (!workExperience) {
    throw new ApiError(httpStatus.NOT_FOUND, "WorkExperience not found");
  }
  Object.assign(workExperience, updateBody);
  await workExperience.save();
  return workExperience;
};

/**
 * Delete workExperience by id
 * @param {ObjectId} id
 * @returns {Promise<WorkExperience>}
 */
const deleteWorkExperienceById = async (id) => {
  const workExperience = await getWorkExperienceById(id);
  if (!workExperience) {
    throw new ApiError(httpStatus.NOT_FOUND, "WorkExperience not found");
  }
  await workExperience.remove();
  return workExperience;
};

module.exports = {
  createWorkExperience,
  queryWorkExperiences,
  getWorkExperienceById,
  updateWorkExperienceById,
  deleteWorkExperienceById,
};
