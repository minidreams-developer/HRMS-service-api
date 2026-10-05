const httpStatus = require('http-status');
const { Announcement, Branch, Department, Team, Designation, User } = require('../models');
const ApiError = require('../utils/ApiError');
const mongoose = require('mongoose');
const { roles } = require('../config/roles');

const audienceKeys = ['roles', 'branches', 'departments', 'teams', 'designations', 'users'];
const normalizeAudience = (audience = {}) => audienceKeys.reduce((result, key) => ({ ...result, [key]: Array.isArray(audience[key]) ? audience[key] : [] }), {});
const refValue = (value) => value && typeof value === 'object' ? (value._id || value.id) : value;
const validateAudience = async (audience) => {
  if (audience === undefined) return undefined;
  const normalized = normalizeAudience(audience);
  if (normalized.roles.some((role) => !roles.includes(role))) throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid audience role');
  for (const [Model, key, label] of [[Branch, 'branches', 'branch'], [Department, 'departments', 'department'], [Team, 'teams', 'team'], [Designation, 'designations', 'designation'], [User, 'users', 'user']]) {
    const ids = normalized[key];
    if (ids.some((id) => !mongoose.Types.ObjectId.isValid(id))) throw new ApiError(httpStatus.BAD_REQUEST, `Invalid audience ${label} ID`);
    if (ids.length && await Model.countDocuments({ _id: { $in: ids } }) !== ids.length) throw new ApiError(httpStatus.BAD_REQUEST, `One or more audience ${label}s do not exist`);
  }
  return normalized;
};
const audienceMatches = (announcement, user) => {
  const audience = announcement.audience || {};
  if (!audienceKeys.some((key) => Array.isArray(audience[key]) && audience[key].length)) return true;
  const matches = (values, value) => (values || []).some((item) => String(refValue(item)) === String(value));
  const work = user.workInformation || {};
  return matches(audience.roles, user.role) || matches(audience.branches, refValue(work.branch)) || matches(audience.departments, refValue(work.department))
    || matches(audience.teams, refValue(work.team)) || matches(audience.designations, refValue(work.designationId)) || matches(audience.users, user._id);
};

/**
 * Derive the correct status from the body fields:
 * - No scheduleDateAndTime         → 'published'  (publish immediately)
 * - scheduleDateAndTime in past    → 'published'  (publish immediately)
 * - scheduleDateAndTime in future  → 'scheduled'  (wait for cron to publish)
 */
const resolveStatus = (body) => {
  if (!body.scheduleDateAndTime) return 'published';
  const scheduled = new Date(body.scheduleDateAndTime);
  if (isNaN(scheduled.getTime())) return 'published';
  return scheduled <= new Date() ? 'published' : 'scheduled';
};

/**
 * Create an announcement.
 * - If scheduleDateAndTime is in the future  → status: 'scheduled'
 * - Otherwise                                → status: 'published', publishedAt: now
 * @param {Object} body
 * @returns {Promise<Announcement>}
 */
const createAnnouncement = async (body, actorId) => {
  const status = resolveStatus(body);
  const audience = await validateAudience(body.audience);
  return Announcement.create({
    ...body,
    ...(audience ? { audience } : {}),
    status,
    publishedAt: status === 'published' ? new Date() : null,
    createdBy: actorId,
  });
};

/**
 * Query announcements with pagination, filtering, and text search.
 *
 * Supported filter keys:
 *   - search   : case-insensitive regex across title, description, content
 *   - title    : exact (case-insensitive) title match
 *   - status   : 'draft' | 'scheduled' | 'published'
 *   - fromDate : scheduleDateAndTime >= fromDate
 *   - toDate   : scheduleDateAndTime <= toDate
 *
 * @param {Object} filter   - { search?, title?, status?, fromDate?, toDate? }
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

  // Exact title filter
  if (filter.title) {
    query.title = new RegExp(filter.title, 'i');
  }

  // Management list: no status filter means all statuses. Legacy records remain readable.
  if (filter.status) {
    query.status = filter.status;
  }

  // Date range on scheduleDateAndTime
  if (filter.fromDate || filter.toDate) {
    query.scheduleDateAndTime = {};
    if (filter.fromDate) query.scheduleDateAndTime.$gte = new Date(filter.fromDate);
    if (filter.toDate)   query.scheduleDateAndTime.$lte = new Date(filter.toDate);
  }
  if (filter.isActive !== undefined) query.isActive = filter.isActive;

  // Default sort: newest first
  if (!options.sortBy) {
    options.sortBy = 'createdAt:desc';
  }

  return Announcement.paginate(query, options);
};

/**
 * Get announcement by id
 * @param {ObjectId} id
 * @returns {Promise<Announcement>}
 */
const getAnnouncementById = async (id) => {
  return Announcement.findById(id).populate('createdBy updatedBy deactivatedBy', 'name email employeeId role');
};

/**
 * Update announcement by id.
 * Re-evaluates status if scheduleDateAndTime is changed.
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<Announcement>}
 */
const updateAnnouncementById = async (id, updateBody, actorId) => {
  const announcement = await getAnnouncementById(id);
  if (!announcement) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Announcement not found');
  }

  // If scheduleDateAndTime is being updated, re-derive status
  if (updateBody.scheduleDateAndTime !== undefined) {
    const newStatus = resolveStatus(updateBody);
    updateBody.status = newStatus;
    updateBody.publishedAt = newStatus === 'published' ? new Date() : null;
  }
  if (updateBody.audience !== undefined) updateBody.audience = await validateAudience(updateBody.audience);
  delete updateBody.createdBy;
  delete updateBody.deactivatedBy;
  delete updateBody.deactivatedAt;
  if (actorId) updateBody.updatedBy = actorId;

  Object.assign(announcement, updateBody);
  await announcement.save();
  return announcement;
};

/**
 * Delete announcement by id
 * @param {ObjectId} id
 * @returns {Promise<Announcement>}
 */
const deleteAnnouncementById = async (id, actorId) => {
  const announcement = await getAnnouncementById(id);
  if (!announcement) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Announcement not found');
  }
  announcement.isActive = false;
  announcement.deactivatedAt = new Date();
  announcement.deactivatedBy = actorId;
  announcement.updatedBy = actorId;
  await announcement.save();
  return announcement;
};

/**
 * Add images to an announcement
 * @param {ObjectId} id
 * @param {Array<{imgName: string, imgUrl: string}>} images
 * @returns {Promise<Announcement>}
 */
const addImagesToAnnouncement = async (id, images, actorId) => {
  const announcement = await getAnnouncementById(id);
  if (!announcement) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Announcement not found');
  }
  announcement.images.push(...images);
  if (actorId) announcement.updatedBy = actorId;
  await announcement.save();
  return announcement;
};

/**
 * Remove an image from an announcement by imgName
 * @param {ObjectId} id
 * @param {string} imgName
 * @returns {Promise<Announcement>}
 */
const removeImageFromAnnouncement = async (id, imgName, actorId) => {
  const announcement = await getAnnouncementById(id);
  if (!announcement) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Announcement not found');
  }

  const before = announcement.images.length;
  announcement.images = announcement.images.filter((img) => img.imgName !== imgName);

  if (announcement.images.length === before) {
    throw new ApiError(httpStatus.NOT_FOUND, `Image '${imgName}' not found in this announcement`);
  }

  if (actorId) announcement.updatedBy = actorId;
  await announcement.save();
  return announcement;
};

/**
 * Called by the cron scheduler every minute.
 * Finds all announcements with status 'scheduled' whose scheduleDateAndTime
 * has passed and marks them as 'published'.
 * @returns {Promise<number>} count of announcements published
 */
const publishDueAnnouncements = async () => {
  const now = new Date();
  const result = await Announcement.updateMany(
    {
      status: 'scheduled',
      scheduleDateAndTime: { $lte: now },
    },
    {
      $set: {
        status: 'published',
        publishedAt: now,
      },
    }
  );
  return result.nModified || result.modifiedCount || 0;
};

const getAnnouncementsForUser = async (user, filter, options) => {
  const query = {
    isActive: { $ne: false },
    $or: [{ status: 'published' }, { status: { $exists: false } }, { status: null }],
  };
  if (filter.search) {
    const regex = new RegExp(filter.search, 'i');
    query.$and = [{ $or: [{ title: regex }, { description: regex }, { content: regex }] }];
  }
  if (filter.fromDate || filter.toDate) {
    query.scheduleDateAndTime = {};
    if (filter.fromDate) query.scheduleDateAndTime.$gte = new Date(filter.fromDate);
    if (filter.toDate) query.scheduleDateAndTime.$lte = new Date(filter.toDate);
  }

  const all = await Announcement.find(query)
    .populate('createdBy updatedBy deactivatedBy', 'name email employeeId role')
    .sort(options.sortBy ? options.sortBy.replace(':', ' ') : '-createdAt')
    .lean();
  const visible = all.filter((item) => audienceMatches(item, user));
  const limit = Number(options.limit) || 10;
  const page = Number(options.page) || 1;
  const start = (page - 1) * limit;
  return {
    results: visible.slice(start, start + limit),
    page,
    limit,
    totalResults: visible.length,
    totalPages: Math.ceil(visible.length / limit) || 1,
  };
};
const canUserView = (announcement, user) => Boolean(announcement && announcement.isActive !== false && announcement.status === 'published' && audienceMatches(announcement, user));

module.exports = {
  createAnnouncement,
  queryAnnouncements,
  getAnnouncementById,
  updateAnnouncementById,
  deleteAnnouncementById,
  addImagesToAnnouncement,
  removeImageFromAnnouncement,
  publishDueAnnouncements,
  validateAudience,
  getAnnouncementsForUser,
  canUserView,
};
