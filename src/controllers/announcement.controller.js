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

  const announcement = await announcementService.createAnnouncement(body);
  res.status(httpStatus.CREATED).send(announcement);
});

/**
 * GET /announcements
 * Supports: title, search, sortBy, limit, page
 */
const getAnnouncements = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['title', 'search']);
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
  const announcement = await announcementService.updateAnnouncementById(req.params.announcementId, req.body);
  res.send(announcement);
}); 

/**
 * DELETE /announcements/:announcementId
 */
const deleteAnnouncement = catchAsync(async (req, res) => {
  await announcementService.deleteAnnouncementById(req.params.announcementId);
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * POST /announcements/:announcementId/images
 * Append one or more images to an existing   announcement.
 * Accepts multipart/form-data with an 'images' file field,
 * or a JSON body with { images: [{imgName, imgUrl}] }.
 */
const addImages = catchAsync(async (req, res) => {
  let images = Array.isArray(req.body.images) ? req.body.images : [];

  // Merge any uploaded files
  if (req.files && req.files.length > 0) {
    images = [...images, ...mapUploadedFiles(req.files)];
  }

  if (images.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No images provided');
  }

  const announcement = await announcementService.addImagesToAnnouncement(
    req.params.announcementId,
    images
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
    req.params.imgName
  );
  res.send(announcement);
});

module.exports = {
  createAnnouncement,
  getAnnouncements,
  getAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  addImages,
  removeImage,
};
