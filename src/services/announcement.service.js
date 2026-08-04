const httpStatus = require('http-status');
const { Announcement } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create an announcement
 * @param {Object} body
 * @returns {Promise<Announcement>}
 */
const createAnnouncement = async (body) => {
  return Announcement.create(body);
};

/**
 * Query announcements with pagination, filtering, and text search.
 *
 * Supported filter keys:
 *   - search   : case-insensitive regex across title, description, content
 *   - title    : exact (case-insensitive) title match
 *   - fromDate : scheduleDateAndTime >= fromDate
 *   - toDate   : scheduleDateAndTime <= toDate
 *
 * @param {Object} filter   - { search?, title?, fromDate?, toDate? }
 * @param {Object} options  - { sortBy?, limit?, page? }
 * @returns {Promise<QueryResult>}
 */
const queryAnnouncements = async (filter, options) => {
  const query = {};

  // Free-text search across title, description, content
  if (filter.search) {
    const regex = new RegExp(filter.search, 'i');
    query.$or = [{ title: regex }, { description: regex }, { content: regex }];
  }

  // Exact title filter (takes precedence over search when both are given)
  if (filter.title) {
    query.title = new RegExp(filter.title, 'i');
  }

  // Date range on scheduleDateAndTime
  if (filter.fromDate || filter.toDate) {
    query.scheduleDateAndTime = {};
    if (filter.fromDate) query.scheduleDateAndTime.$gte = new Date(filter.fromDate);
    if (filter.toDate)   query.scheduleDateAndTime.$lte = new Date(filter.toDate);
  }

  // Default sort: newest scheduled first
  if (!options.sortBy) {
    options.sortBy = 'scheduleDateAndTime:desc';
  }

  return Announcement.paginate(query, options);
};

/**
 * Get announcement by id
 * @param {ObjectId} id
 * @returns {Promise<Announcement>}
 */
const getAnnouncementById = async (id) => {
  return Announcement.findById(id);
};

/**
 * Update announcement by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<Announcement>}
 */
const updateAnnouncementById = async (id, updateBody) => {
  const announcement = await getAnnouncementById(id);
  if (!announcement) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Announcement not found');
  }
  Object.assign(announcement, updateBody);
  await announcement.save();
  return announcement;
};

/**
 * Delete announcement by id
 * @param {ObjectId} id
 * @returns {Promise<Announcement>}
 */
const deleteAnnouncementById = async (id) => {
  const announcement = await getAnnouncementById(id);
  if (!announcement) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Announcement not found');
  }
  await announcement.deleteOne();
  return announcement;
};

/**
 * Add images to an announcement
 * @param {ObjectId} id
 * @param {Array<{imgName: string, imgUrl: string}>} images
 * @returns {Promise<Announcement>}
 */
const addImagesToAnnouncement = async (id, images) => {
  const announcement = await getAnnouncementById(id);
  if (!announcement) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Announcement not found');
  }
  announcement.images.push(...images);
  await announcement.save();
  return announcement;
};

/**
 * Remove an image from an announcement by imgName
 * @param {ObjectId} id
 * @param {string} imgName
 * @returns {Promise<Announcement>}
 */
const removeImageFromAnnouncement = async (id, imgName) => {
  const announcement = await getAnnouncementById(id);
  if (!announcement) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Announcement not found');
  }

  const before = announcement.images.length;
  announcement.images = announcement.images.filter((img) => img.imgName !== imgName);

  if (announcement.images.length === before) {
    throw new ApiError(httpStatus.NOT_FOUND, `Image '${imgName}' not found in this announcement`);
  }

  await announcement.save();
  return announcement;
};

module.exports = {
  createAnnouncement,
  queryAnnouncements,
  getAnnouncementById,
  updateAnnouncementById,
  deleteAnnouncementById,
  addImagesToAnnouncement,
  removeImageFromAnnouncement,
};
