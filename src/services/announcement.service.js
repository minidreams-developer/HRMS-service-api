const httpStatus = require("http-status");
const { Announcement } = require("../models");
const ApiError = require("../utils/ApiError");

const createAnnouncement = async (body) => {
  return Announcement.create(body);
};

const queryAnnouncements = async (filter, options) => {
  if (filter.search) {
    const search = filter.search;
    delete filter.search;

    const regex = new RegExp(search, "i");

    filter.$or = [{ title: regex }, { description: regex }, { content: regex }];
  }

  const announcements = await Announcement.paginate(filter, options);
  return announcements;
};

const getAnnouncementById = async (id) => {
  return Announcement.findById(id);
};

const updateAnnouncementById = async (id, updateBody) => {
  const announcement = await getAnnouncementById(id);
  if (!announcement) {
    throw new ApiError(httpStatus.NOT_FOUND, "Announcement not found");
  }
  Object.assign(announcement, updateBody);
  await announcement.save();
  return announcement;
};

const deleteAnnouncementById = async (id) => {
  const announcement = await getAnnouncementById(id);
  if (!announcement) {
    throw new ApiError(httpStatus.NOT_FOUND, "Announcement not found");
  }
  await announcement.remove();
  return announcement;
};

module.exports = {
  createAnnouncement,
  queryAnnouncements,
  getAnnouncementById,
  updateAnnouncementById,
  deleteAnnouncementById,
};
