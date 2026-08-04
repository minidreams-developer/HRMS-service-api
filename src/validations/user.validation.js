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
    // ── Distinct helper ─────────────────────────────────────────────────────
    distinct:     Joi.string().valid('department', 'role').optional(),

    // ── Free-text search ────────────────────────────────────────────────────
    // Matches name, email, or employeeId (case-insensitive)
    search:       Joi.string().optional(),

    // ── Basic field filters ─────────────────────────────────────────────────
    name:         Joi.string().optional(),
    role:         Joi.string().valid(...ROLES).optional(),
    empId:        Joi.string().optional(),
    gender:       Joi.string().valid('male', 'female', 'other').optional(),

    // ── Work-information filters ─────────────────────────────────────────────
    departmentId: Joi.string().custom(objectId).optional(),
    teamId:       Joi.string().custom(objectId).optional(),
    branchId:     Joi.string().custom(objectId).optional(),
    designation:  Joi.string().optional(),
    shiftId:      Joi.string().custom(objectId).optional(),

    // ── Status filter — Active | In-Active | Relieved ────────────────────────
    status:       Joi.string().valid('Active', 'In-Active', 'Relieved').optional(),

    // ── Joined-date range ────────────────────────────────────────────────────
    joinedFrom:   Joi.date().iso().optional(),
    joinedTo:     Joi.date().iso().optional(),

    // ── Sorting & pagination ─────────────────────────────────────────────────
    sortBy:       Joi.string().optional(),
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
