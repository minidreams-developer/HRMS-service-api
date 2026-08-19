const httpStatus = require('http-status');
const { Announcement } = require('../models');
const ApiError = require('../utils/ApiError');

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
const createAnnouncement = async (body) => {
  const status = resolveStatus(body);
  return Announcement.create({
    ...body,
    status,
    publishedAt: status === 'published' ? new Date() : null,
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

  // Status filter — default to published, but also include old docs with no status field
  if (filter.status) {
    query.status = filter.status;
  } else {
    // No filter provided: return published docs + legacy docs that predate the status field
    query.$or = [
      { status: 'published' },
      { status: { $exists: false } },
      { status: null },
    ];
  }

  // Date range on scheduleDateAndTime
  if (filter.fromDate || filter.toDate) {
    query.scheduleDateAndTime = {};
    if (filter.fromDate) query.scheduleDateAndTime.$gte = new Date(filter.fromDate);
    if (filter.toDate)   query.scheduleDateAndTime.$lte = new Date(filter.toDate);
  }

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
  return Announcement.findById(id);
};

/**
 * Update announcement by id.
 * Re-evaluates status if scheduleDateAndTime is changed.
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<Announcement>}
 */
const updateAnnouncementById = async (id, updateBody) => {
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

module.exports = {
  createAnnouncement,
  queryAnnouncements,
  getAnnouncementById,
  updateAnnouncementById,
  deleteAnnouncementById,
  addImagesToAnnouncement,
  removeImageFromAnnouncement,
  publishDueAnnouncements,
};
