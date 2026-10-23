const Joi = require('joi');
const { password, objectId } = require('./custom.validation');

const objectIdList = Joi.alternatives().try(
  Joi.array().items(Joi.string().custom(objectId)),
  Joi.string().custom((value, helpers) => {
    const values = String(value).split(',').map((item) => item.trim()).filter(Boolean);
    if (!values.length || values.some((item) => !/^[0-9a-fA-F]{24}$/.test(item))) return helpers.error('any.invalid');
    return value;
  })
).optional();

// Custom validation for status - accepts case-insensitive and normalizes to proper case
const statusValidator = (value, helpers) => {
  const normalizedValue = value.toLowerCase();
  const statusMap = {
    'active': 'Active',
    'in-active': 'In-Active',
    'inactive': 'In-Active',
    'relieved': 'Relieved'
  };
  
  if (statusMap[normalizedValue]) {
    return statusMap[normalizedValue];
  }
  
  return helpers.error('any.only');
};

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
    role: Joi.string().required().valid(...ROLES),
    roleId: Joi.string().custom(objectId).optional(),
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
    departmentIds: objectIdList,
    teamId:       Joi.string().custom(objectId).optional(),
    branchId:     Joi.string().custom(objectId).optional(),
    designation:  Joi.string().optional(),
    designationId: Joi.string().custom(objectId).optional(),
    designationIds: objectIdList,
    shiftId:      Joi.string().custom(objectId).optional(),
    shiftIds: objectIdList,
    contractAgent: Joi.string().optional(),

    // ── Status filter — Active | In-Active | Relieved ────────────────────────
    // Accepts case-insensitive input and normalizes to proper case
    status:       Joi.string().custom(statusValidator).optional(),

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
      roleId: Joi.string().custom(objectId),
      // Public API status maps to the User model's isActive field.
      status: Joi.string().custom(statusValidator),
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
      }).unknown(true),
    })
    // The update service supports the wider employee profile payload
    // (phone, gender, addresses, emergencyContacts, workInformation, etc.).
    // Keep validation for declared fields, but pass supported profile fields
    // through instead of rejecting them as unknown keys.
    .unknown(true)
    .min(1),
};

const updateProfile = {
  body: Joi.object().keys({
    name: Joi.string().trim(),
    phone: Joi.number(),
    profilePic: Joi.string().allow(''),
    gender: Joi.string().valid('male', 'female', 'other'),
    dateOfBirth: Joi.date().iso(),
    age: Joi.number().integer().min(0),
    spokenLanguages: Joi.array().items(Joi.string()),
    martialStatus: Joi.string(),
    motherTongue: Joi.string(),
    identificationMark: Joi.string().allow(''),
    religion: Joi.string().allow(''),
    address: Joi.array().items(Joi.object().unknown(true)),
    addresses: Joi.array().items(Joi.object().unknown(true)),
    emergencyContact: Joi.array().items(Joi.object().unknown(true)),
    emergencyContacts: Joi.array().items(Joi.object().unknown(true)),
  }).min(1),
};

const changePassword = {
  body: Joi.object().keys({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().required().custom(password),
    confirmPassword: Joi.string().required().valid(Joi.ref('newPassword')),
  }).min(3),
};

const getEmployeeByEmpId = {
  params: Joi.object().keys({
    employeeId: Joi.string().required(),
  }),
};

const getUsersDropdown = {
  query: Joi.object().keys({
    // Role filter - can be single value or comma-separated
    role: Joi.string().optional(),
    // Search term
    search: Joi.string().optional(),
  }),
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
  getEmployeeByEmpId,
  getUsersDropdown,
  updateUser,
  updateProfile,
  changePassword,
  deleteUser,
};
