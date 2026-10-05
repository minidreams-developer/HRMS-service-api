const Joi = require('joi');
const { objectId } = require('./custom.validation');

const exitInformation = Joi.object().keys({
  exitType: Joi.string().allow('').optional(),
  exitReason: Joi.string().allow('').optional(),
  resignationSubmitionDate: Joi.date().allow(null, '').optional(),
  lastWorkingDate: Joi.date().allow(null, '').optional(),
  noticePeriod: Joi.date().allow(null, '').optional(),
  actualNoticePeriod: Joi.date().allow(null, '').optional(),
  waiver: Joi.boolean().optional(),
  exitApprovedBy: Joi.string().custom(objectId).allow('').optional(),
  approvalDate: Joi.date().allow(null, '').optional(),
}).optional();

const finalSettlement = Joi.object().keys({
  lastMonthSalary: Joi.boolean().optional(),
  pendingSalary: Joi.boolean().optional(),
  leaveEncashment: Joi.boolean().optional(),
  bonus_incentives: Joi.boolean().optional(),
  reimbursements: Joi.boolean().optional(),
  noticePay: Joi.boolean().optional(),
  assetDamge: Joi.boolean().optional(),
  loanRecovery: Joi.boolean().optional(),
  advanceSalary: Joi.boolean().optional(),
  taxAdjustments: Joi.boolean().optional(),
  tenth_marksheet: Joi.boolean().optional(),
  twelevth_marksheet: Joi.boolean().optional(),
}).optional();

const createOffBoard = {
  body: Joi.object().unknown(true),
};
const updateStatus = { params: Joi.object({ offBoardId: Joi.string().custom(objectId).required() }), body: Joi.object({ status: Joi.string().valid('pendingApproval', 'approved', 'rejected').required(), reason: Joi.string().allow('').optional() }) };
const finalize = { params: Joi.object({ offBoardId: Joi.string().custom(objectId).required() }) };

const getOffBoards = {
  query: Joi.object().keys({
    // filter by specific user
    userId:          Joi.string().custom(objectId).optional(),
    // search across linked user's name, email, employeeId
    search:          Joi.string().optional(),
    // exit type filter
    exitType:        Joi.string().optional(),
    status:          Joi.string().valid('draft', 'pendingApproval', 'approved', 'rejected', 'relieved', 'cancelled').optional(),
    role:            Joi.string().valid('employee', 'staff', 'agent', 'manager', 'hr_manager', 'team_lead', 'admin', 'subAdmin', 'contractor').optional(),
    departmentId:    Joi.string().custom(objectId).optional(),
    // last working date range
    lastWorkingFrom: Joi.date().iso().optional(),
    lastWorkingTo:   Joi.date().iso().optional(),
    // pagination & sorting
    sortBy:          Joi.string().optional(),
    limit:           Joi.number().integer().min(1).optional(),
    page:            Joi.number().integer().min(1).optional(),
  }),
};

const getOffBoardSummary = {
  query: Joi.object().keys({
    exitType: Joi.string().optional(),
    status: Joi.string().valid('draft', 'pendingApproval', 'approved', 'rejected', 'relieved', 'cancelled').optional(),
    range: Joi.number().integer().min(1).max(3660).optional(),
    role: Joi.string().valid('employee', 'staff', 'agent', 'manager', 'hr_manager', 'team_lead', 'admin', 'subAdmin', 'contractor').optional(),
    departmentId: Joi.string().custom(objectId).optional(),
  }),
};

const getOffBoard = {
  params: Joi.object().keys({
    offBoardId: Joi.string().custom(objectId).required(),
  }),
};

const getOffBoardByUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
  }),
};

const updateOffBoard = {
  params: Joi.object().keys({
    offBoardId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().unknown(true).min(1),
};

const deleteOffBoard = {
  params: Joi.object().keys({
    offBoardId: Joi.string().custom(objectId).required(),
  }),
};

const sendOtp = {
  params: Joi.object().keys({
    offBoardId: Joi.string().custom(objectId).required(),
  }),
};

const verifyOtp = {
  params: Joi.object().keys({
    offBoardId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    otp: Joi.string().length(6).pattern(/^\d+$/).required(),
  }),
};

module.exports = {
  createOffBoard,
  getOffBoards,
  getOffBoardSummary,
  getOffBoard,
  getOffBoardByUser,
  updateOffBoard,
  deleteOffBoard,
  sendOtp,
  verifyOtp,
  updateStatus,
  finalize,
};
