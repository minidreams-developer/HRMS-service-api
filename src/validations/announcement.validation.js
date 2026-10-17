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
    images:              Joi.array().items(imageSchema).optional(),
    audience: Joi.object({
      roles: Joi.array().items(Joi.string()),
      branches: Joi.array().items(Joi.string().custom(objectId)),
      departments: Joi.array().items(Joi.string().custom(objectId)),
      teams: Joi.array().items(Joi.string().custom(objectId)),
      designations: Joi.array().items(Joi.string().custom(objectId)),
      users: Joi.array().items(Joi.string().custom(objectId)),
    }).optional(),
  }).unknown(false),
};

const getAnnouncements = {
  query: Joi.object().keys({
    // exact title match
    title:    Joi.string(),
    // free-text search across title, description, content
    search:   Joi.string(),
    // status filter
    status:   Joi.string().valid('draft', 'scheduled', 'published').optional(),
    isActive: Joi.boolean().optional(),
    // date range filter on scheduleDateAndTime
    fromDate: Joi.date().iso().optional(),
    toDate:   Joi.date().iso().optional().when('fromDate', {
      is:        Joi.exist(),
      then:      Joi.date().iso().min(Joi.ref('fromDate')),
      otherwise: Joi.date().iso(),
    }),
    // pagination / sorting
    sortBy:   Joi.string(),
    limit:    Joi.number().integer().min(1),
    page:     Joi.number().integer().min(1),
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
      audience: Joi.object({
        roles: Joi.array().items(Joi.string()),
        branches: Joi.array().items(Joi.string().custom(objectId)),
        departments: Joi.array().items(Joi.string().custom(objectId)),
        teams: Joi.array().items(Joi.string().custom(objectId)),
        designations: Joi.array().items(Joi.string().custom(objectId)),
        users: Joi.array().items(Joi.string().custom(objectId)),
      }),
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
