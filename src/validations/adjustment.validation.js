const Joi = require('joi');
const { objectId } = require('./custom.validation');

const components = ['bonus', 'incentive', 'advance', 'penalty', 'emi', 'other'];
const emiDetails = Joi.object({
  affectFrom: Joi.object({ month: Joi.number().integer().min(1).max(12).required(), year: Joi.number().integer().min(2000).max(2100).required() }).required(),
  affectTo: Joi.object({ month: Joi.number().integer().min(1).max(12).required(), year: Joi.number().integer().min(2000).max(2100).required() }).required(),
  totalMonths: Joi.number().integer().min(1).required(),
  perMonthDeduction: Joi.number().greater(0).required(),
}).unknown(false);
const baseQuery = {
  month: Joi.number().integer().min(1).max(12), year: Joi.number().integer().min(2000).max(2100),
  status: Joi.string().valid('draft', 'pending', 'approved', 'rejected', 'canceled', 'applied'),
  type: Joi.string().valid('addition', 'deduction'), component: Joi.string().valid(...components),
  search: Joi.string().allow(''), employeeId: Joi.string().custom(objectId),
  page: Joi.number().integer().min(1), limit: Joi.number().integer().min(1).max(200), sortBy: Joi.string(),
};

const create = { body: Joi.object({
  forWhom: Joi.string().valid('individual', 'team').required(), employeeId: Joi.when('forWhom', { is: 'individual', then: Joi.string().required(), otherwise: Joi.forbidden() }), teamId: Joi.when('forWhom', { is: 'team', then: Joi.string().required(), otherwise: Joi.forbidden() }),
  type: Joi.string().valid('addition', 'deduction').required(), component: Joi.string().valid(...components).required(),
  date: Joi.date().required(), payrollMonth: Joi.number().integer().min(1).max(12).required(),
  payrollYear: Joi.number().integer().min(2000).max(2100).required(), amount: Joi.number().greater(0).required(),
  appliedToPayroll: Joi.boolean(), emiDetails: Joi.when('component', { is: 'emi', then: emiDetails.required(), otherwise: Joi.forbidden() }), remarks: Joi.string().allow(''), departmentId: Joi.string().custom(objectId),
}).custom((value, helpers) => {
  const additionOnly = ['bonus', 'incentive', 'other'];
  const deductionOnly = ['advance', 'emi', 'penalty'];
  if ((value.type === 'addition' && deductionOnly.includes(value.component))
    || (value.type === 'deduction' && additionOnly.slice(0, 2).includes(value.component))) {
    return helpers.message('"component" is not valid for the selected "type"');
  }
  return value;
}).unknown(false) };
const list = { query: Joi.object(baseQuery) };
const id = { params: Joi.object({ adjustmentId: Joi.string().custom(objectId).required() }) };
const status = { params: id.params, body: Joi.object({ status: Joi.string().valid('approved', 'rejected', 'canceled', 'applied').required() }) };
const update = { params: id.params, body: Joi.object({ type: Joi.string().valid('addition', 'deduction'), component: Joi.string().valid(...components), date: Joi.date(), payrollMonth: Joi.number().integer().min(1).max(12), payrollYear: Joi.number().integer().min(2000).max(2100), amount: Joi.number().greater(0), appliedToPayroll: Joi.boolean(), emiDetails: Joi.object(), remarks: Joi.string().allow('') }).min(1) };
const quickStats = { query: Joi.object({ month: Joi.number().integer().min(1).max(12), year: Joi.number().integer().min(2000).max(2100) }) };

module.exports = { create, list, id, status, update, quickStats };
