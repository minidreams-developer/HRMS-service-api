const Joi = require('joi');
const { password, objectId } = require('./custom.validation');

// Roles must stay in sync with src/config/roles.js
const ROLES = ['employee', 'hr_manager', 'team_lead', 'agent', 'staff', 'manager', 'subAdmin', 'admin', 'contractor'];

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
    // Basic filters
    name:         Joi.string().optional(),
    role:         Joi.string().valid(...ROLES).optional(),
    empId:        Joi.string().optional(),

    // Department filter (Select Department panel)
    departmentId: Joi.string().custom(objectId).optional(),

    // Designations filter (Select Designations panel)
    designation:  Joi.string().optional(),

    // Shift filter (Select Shift panel)
    shiftId:      Joi.string().custom(objectId).optional(),

    // Status filter — Active | Inactive | Relieved
    status:       Joi.string().valid('active', 'inactive', 'relieved').optional(),

    // Date Range filter (joined date From / To)
    joinedFrom:   Joi.date().iso().optional(),
    joinedTo:     Joi.date().iso().optional(),

    // Sort By — date | name | status | amount
    sortBy:       Joi.string().optional(),

    // Pagination
    limit:        Joi.number().integer().min(1).max(100).optional(),
    page:         Joi.number().integer().min(1).optional(),
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
