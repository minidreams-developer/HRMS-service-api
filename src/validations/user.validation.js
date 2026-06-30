const Joi = require('joi');
const { password, objectId } = require('./custom.validation');

const registerEmployee = {
  body: Joi.object().unknown(true),
};

const createUser = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().custom(password),
    name: Joi.string().required(),
    role: Joi.string().required().valid('user', 'admin'),
  }),
};

const getUsers = {
  query: Joi.object().keys({
    name: Joi.string(),
    role: Joi.string(),
    empId: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const updateUser = {
  params: Joi.object().keys({
    userId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      email: Joi.string().email(),
      password: Joi.string().custom(password),
      name: Joi.string(),
      employee: Joi.object().keys({
        employeeId: Joi.string(),
        designation: Joi.string(),
        department: Joi.string().custom(objectId),
        shift: Joi.string(),
        employeeStatus: Joi.string().valid('active', 'inactive', 'relieved'),
        employeeDocuments: Joi.array().items(
          Joi.object().keys({
            fileUrl: Joi.string(),
            fileType: Joi.string(),
          })
        ),
        employeeType: Joi.string().valid('full_time', 'part_time'),
        joinedDate: Joi.date(),
      }),
    })
    .min(1),
};

const deleteUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  registerEmployee,
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
};
