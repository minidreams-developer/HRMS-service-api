const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createPermission = { body: Joi.object({
  user: Joi.string().custom(objectId).required(),
  date: Joi.date().optional(),
  from: Joi.date().required(),
  to: Joi.date().required(),
  totalHours: Joi.forbidden(),
  reason: Joi.string().max(1000).optional(),
}) };
const getPermissions = { query: Joi.object({
  user: Joi.string().custom(objectId), permissionStatus: Joi.string().valid('pending', 'approved', 'rejected', 'cancelled'),
  date: Joi.date(), sortBy: Joi.string(), limit: Joi.number().integer().min(1), page: Joi.number().integer().min(1),
}) };
const id = { params: Joi.object({ permissionId: Joi.string().custom(objectId).required() }) };
const updatePermission = { params: id.params, body: Joi.object({
  permissionStatus: Joi.string().valid('approved', 'rejected', 'cancelled').required(),
  rejectionReason: Joi.string().allow('').optional(), cancellationReason: Joi.string().allow('').optional(),
}).custom((v, h) => {
  if (v.permissionStatus === 'rejected' && !String(v.rejectionReason || '').trim()) return h.error('any.invalid');
  if (v.permissionStatus === 'cancelled' && !String(v.cancellationReason || '').trim()) return h.error('any.invalid');
  return v;
}) };
module.exports = { createPermission, getPermissions, getPermission: id, updatePermission, deletePermission: id };
