const Joi = require('joi');
const { objectId } = require('./custom.validation');

// ─── Reusable sub-schemas ────────────────────────────────────────────────────

const addressSchema = Joi.object({
  addressLine1: Joi.string().trim(),
  addressLine2: Joi.string().trim().allow(''),
  district: Joi.string().trim(),
  city: Joi.string().trim(),
  state: Joi.string().trim(),
  pincode: Joi.number(),
  country: Joi.string().trim().default('India'),
});

const emergencyContactSchema = Joi.object({
  contactName: Joi.string().trim().required(),
  phone: Joi.number().required(),
  relationship: Joi.string().trim(),
  // Optional embedded address for the emergency contact
  address: addressSchema,
});

const jobItemSchema = Joi.object({
  jobItems: Joi.string().trim().required(),
  unit: Joi.string().trim().required(),
  price: Joi.number().default(0),
  region: Joi.string().valid('headquarters', 'northRegion').required(),
});

// ─── Exported validation schemas ─────────────────────────────────────────────

/**
 * POST /v1/contractors/register
 */
const registerContractor = {
  body: Joi.object().keys({
    // ── Personal information ───────────────────────────────────────────────
    name: Joi.string().trim().required(),
    email: Joi.string().email().trim().lowercase().required(),
    password: Joi.string().min(8).required(),
    phone: Joi.number().required(),
    gender: Joi.string().valid('male', 'female', 'other').lowercase(),
    dateOfBirth: Joi.date(),
    age: Joi.number().integer(),
    motherTongue: Joi.string().trim(),
    religion: Joi.string().trim(),
    identificationMark: Joi.string().trim().allow(''),
    profilePic: Joi.string().uri().allow(''),

    // ── Documents ─────────────────────────────────────────────────────────
    documentNo: Joi.object({
      aadharNo: Joi.number(),
      panNo: Joi.string().trim(),
    }),

    // ── Address ───────────────────────────────────────────────────────────
    address: addressSchema,

    // ── Emergency contacts ────────────────────────────────────────────────
    emergencyContacts: Joi.array().items(emergencyContactSchema),

    // ── Work & job information ────────────────────────────────────────────
    // branch and reportingPerson are Schema.Types.Mixed on the User model,
    // so they accept either an ObjectId string or a plain string value.
    workInformation: Joi.object({
      companyName: Joi.string().trim().required(),
      specialty: Joi.string().trim(),
      LicenseNo: Joi.string().trim(),
      dateOfJoining: Joi.date(),
      branch: Joi.string(),
      reportingPerson: Joi.string(),
    }),

    // ── Job items (one or many, headquarters / northRegion) ───────────────
    jobItems: Joi.array().items(jobItemSchema),
  }),
};

/**
 * GET /v1/contractors
 */
const getContractors = {
  query: Joi.object().keys({
    name: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

/**
 * GET /v1/contractors/:contractorId
 * Accepts MongoDB _id (ObjectId) OR employeeId (e.g. CTR-258540)
 */
const getContractor = {
  params: Joi.object().keys({
    contractorId: Joi.string().required(),
  }),
};

/**
 * PATCH /v1/contractors/:contractorId
 */
const updateContractor = {
  params: Joi.object().keys({
    contractorId: Joi.string().required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().trim(),
      email: Joi.string().email().trim().lowercase(),
      phone: Joi.number(),
      gender: Joi.string().valid('male', 'female', 'other').lowercase(),
      dateOfBirth: Joi.date(),
      age: Joi.number().integer(),
      motherTongue: Joi.string().trim(),
      religion: Joi.string().trim(),
      identificationMark: Joi.string().trim().allow(''),
      profilePic: Joi.string().uri().allow(''),
      documentNo: Joi.object({
        aadharNo: Joi.number(),
        panNo: Joi.string().trim(),
      }),
      workInformation: Joi.object({
        companyName: Joi.string().trim(),
        specialty: Joi.string().trim(),
        LicenseNo: Joi.string().trim(),
        dateOfJoining: Joi.date(),
        branch: Joi.string(),
        reportingPerson: Joi.string(),
      }),
    })
    .min(1),
};

/**
 * DELETE /v1/contractors/:contractorId
 */
const deleteContractor = {
  params: Joi.object().keys({
    contractorId: Joi.string().required(),
  }),
};

module.exports = {
  registerContractor,
  getContractors,
  getContractor,
  updateContractor,
  deleteContractor,
};
