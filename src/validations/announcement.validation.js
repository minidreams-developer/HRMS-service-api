const Joi = require('joi');
const { objectId } = require('./custom.validation');

const imageSchema = Joi.object({
  imgName: Joi.string().required(),
  imgUrl:  Joi.string().uri().required(),
});

const createAnnouncement = {
  body: Joi.object().keys({
    title:               Joi.string().optional(),
    description:         Joi.string().optional(),
    content:             Joi.string().optional(),
    scheduleDateAndTime: Joi.date().optional(),
    // images is populated from req.files by the controller — not validated here
  }).unknown(true),
};

const getAnnouncements = {
  query: Joi.object().keys({
    title:   Joi.string(),
    search:  Joi.string(),
    sortBy:  Joi.string(),
    limit:   Joi.number().integer().min(1),
    page:    Joi.number().integer().min(1),
  }),
};

const getAnnouncement = {
  params: Joi.object().keys({
    announcementId: Joi.string().custom(objectId).required(),
  }),
};

const updateAnnouncement = {
  params: Joi.object().keys({
    announcementId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      title:               Joi.string(),
      description:         Joi.string(),
      content:             Joi.string(),
      scheduleDateAndTime: Joi.date(),
      images:              Joi.array().items(imageSchema),
    })
    .min(1),
};

const deleteAnnouncement = {
  params: Joi.object().keys({
    announcementId: Joi.string().custom(objectId).required(),
  }),
};

const addImages = {
  params: Joi.object().keys({
    announcementId: Joi.string().custom(objectId).required(),
  }),
  // images come from req.files via multer — body may be empty
  body: Joi.object().unknown(true),
};

const removeImage = {
  params: Joi.object().keys({
    announcementId: Joi.string().custom(objectId).required(),
    imgName:        Joi.string().required(),
  }),
};

module.exports = {
  createAnnouncement,
  getAnnouncements,
  getAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  addImages,
  removeImage,
};
