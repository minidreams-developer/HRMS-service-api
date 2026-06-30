const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { announcementService } = require('../services');

const createAnnouncement = catchAsync(async (req, res) => {
  const announcement = await announcementService.createAnnouncement(req.body);
  res.status(httpStatus.CREATED).send(announcement);
});

const getAnnouncements = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['title', 'search']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await announcementService.queryAnnouncements(filter, options);
  res.send(result);
});

const getAnnouncement = catchAsync(async (req, res) => {
  const announcement = await announcementService.getAnnouncementById(req.params.announcementId);
  if (!announcement) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Announcement not found');
  }
  res.send(announcement);
});

const updateAnnouncement = catchAsync(async (req, res) => {
  const announcement = await announcementService.updateAnnouncementById(req.params.announcementId, req.body);
  res.send(announcement);
});

const deleteAnnouncement = catchAsync(async (req, res) => {
  await announcementService.deleteAnnouncementById(req.params.announcementId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createAnnouncement,
  getAnnouncements,
  getAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};
