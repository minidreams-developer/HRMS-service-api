const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { announcementService } = require('../services');

/**
 * Converts multer/Cloudinary uploaded files (req.files) into the
 * { imgName, imgUrl } shape the model expects.
 */
const mapUploadedFiles = (files = []) =>
  files.map((file) => ({
    imgName: file.originalname,
    imgUrl: file.path, // Cloudinary returns the secure URL in file.path
  }));

/**
 * POST /announcements
 */
const createAnnouncement = catchAsync(async (req, res) => {
  const body = { ...req.body };

  // Merge uploaded files into body.images
  if (req.files && req.files.length > 0) {
    const uploadedImages = mapUploadedFiles(req.files);
    const existingImages = Array.isArray(body.images) ? body.images : [];
    body.images = [...existingImages, ...uploadedImages];
  }

  const announcement = await announcementService.createAnnouncement(body, req.user._id);
  res.status(httpStatus.CREATED).send(announcement);
});

/**
 * GET /announcements
 * Supports: title, search, fromDate, toDate, status, sortBy, limit, page
 */
const getAnnouncements = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['title', 'search', 'fromDate', 'toDate', 'status', 'isActive']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await announcementService.queryAnnouncements(filter, options);
  res.send(result);
});

/**
 * GET /announcements/:announcementId
 */
const getAnnouncement = catchAsync(async (req, res) => {
  const announcement = await announcementService.getAnnouncementById(req.params.announcementId);
  if (!announcement) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Announcement not found');
  }
  res.send(announcement);
});

/**
 * PATCH /announcements/:announcementId
 */
const updateAnnouncement = catchAsync(async (req, res) => {
  const announcement = await announcementService.updateAnnouncementById(req.params.announcementId, req.body, req.user._id);
  res.send(announcement);
});

/**
 * PATCH /announcements/:announcementId/schedule
 * Set or update the scheduled publish time for an existing announcement.
 * Body: { scheduleDateAndTime: ISO date string }
 */
const scheduleAnnouncement = catchAsync(async (req, res) => {
  const { scheduleDateAndTime } = req.body;

  if (!scheduleDateAndTime) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'scheduleDateAndTime is required');
  }

  const scheduled = new Date(scheduleDateAndTime);
  if (isNaN(scheduled.getTime())) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'scheduleDateAndTime must be a valid date');
  }

  if (scheduled <= new Date()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'scheduleDateAndTime must be a future date and time');
  }

  const announcement = await announcementService.updateAnnouncementById(
    req.params.announcementId,
    { scheduleDateAndTime: scheduled }, req.user._id
  );

  res.send(announcement);
});

/**
 * DELETE /announcements/:announcementId
 */
const deleteAnnouncement = catchAsync(async (req, res) => {
  await announcementService.deleteAnnouncementById(req.params.announcementId, req.user._id);
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * POST /announcements/:announcementId/images
 * Append one or more images to an existing announcement.
 */
const addImages = catchAsync(async (req, res) => {
  let images = Array.isArray(req.body.images) ? req.body.images : [];

  if (req.files && req.files.length > 0) {
    images = [...images, ...mapUploadedFiles(req.files)];
  }

  if (images.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No images provided');
  }

  const announcement = await announcementService.addImagesToAnnouncement(
    req.params.announcementId,
    images,
    req.user._id
  );
  res.send(announcement);
});

/**
 * DELETE /announcements/:announcementId/images/:imgName
 * Remove a single image from an announcement by its imgName.
 */
const removeImage = catchAsync(async (req, res) => {
  const announcement = await announcementService.removeImageFromAnnouncement(
    req.params.announcementId,
    req.params.imgName,
    req.user._id
  );
  res.send(announcement);
});

const getMyAnnouncements = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['search', 'fromDate', 'toDate']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  res.send(await announcementService.getAnnouncementsForUser(req.user, filter, options));
});

const getMyAnnouncement = catchAsync(async (req, res) => {
  const announcement = await announcementService.getAnnouncementById(req.params.announcementId);
  if (!announcement || !announcementService.canUserView(announcement, req.user)) throw new ApiError(httpStatus.NOT_FOUND, 'Announcement not found');
  res.send(announcement);
});

module.exports = {
  createAnnouncement,
  getAnnouncements,
  getAnnouncement,
  updateAnnouncement,
  scheduleAnnouncement,
  deleteAnnouncement,
  addImages,
  removeImage,
  getMyAnnouncements,
  getMyAnnouncement,
};
