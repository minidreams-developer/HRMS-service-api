const mongoose = require('mongoose');
const { User, ContractorWorkerAssignment, ContractorSettlement } = require('../models');
const ApiError = require('../utils/ApiError');

const day = (v) => { const d = new Date(v); if (Number.isNaN(d.getTime())) throw new ApiError(400, 'Invalid assignment date'); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); };
const end = (v) => v ? new Date(day(v).getTime() + 86399999) : null;
const overlap = (a, b, c, d) => a <= (d || new Date('9999-12-31')) && c <= (b || new Date('9999-12-31'));
const validateParties = async (workerId, contractorId) => {
  const [worker, contractor] = await Promise.all([User.findById(workerId), User.findById(contractorId)]);
  if (!worker || worker.isDeleted || worker.isActive !== 'Active' || !['employee', 'staff'].includes(worker.role)) throw new ApiError(400, 'Worker must be an active employee or staff user');
  if (!contractor || contractor.isDeleted || contractor.isActive !== 'Active' || contractor.role !== 'contractor') throw new ApiError(400, 'Contractor must be an active contractor');
  return { worker, contractor };
};
const create = async (body, actorId) => {
  const from = day(body.effectiveFrom); const to = end(body.effectiveTo);
  if (to && to < from) throw new ApiError(400, 'effectiveTo must be on or after effectiveFrom');
  await validateParties(body.workerId, body.contractorId);
  const existing = await ContractorWorkerAssignment.find({ workerId: body.workerId, status: 'active' });
  if (existing.some((a) => overlap(from, to, a.effectiveFrom, a.effectiveTo))) throw new ApiError(409, 'Worker assignment overlaps an existing assignment');
  return ContractorWorkerAssignment.create({ ...body, effectiveFrom: from, effectiveTo: to, assignedBy: actorId });
};
const getForDate = async (workerId, date) => { const d = day(date); return ContractorWorkerAssignment.findOne({ workerId, effectiveFrom: { $lte: d }, $or: [{ effectiveTo: null }, { effectiveTo: { $exists: false } }, { effectiveTo: { $gte: d } }] }).sort({ effectiveFrom: -1, _id: -1 }).lean(); };
const history = async (workerId) => ContractorWorkerAssignment.find({ workerId }).populate('contractorId', 'name employeeId role isActive isDeleted').populate('assignedBy endedBy', 'name employeeId').sort({ effectiveFrom: -1 }).lean();
const update = async (id, body, actorId) => {
  const assignment = await ContractorWorkerAssignment.findById(id); if (!assignment) throw new ApiError(404, 'Assignment not found');
  if (body.sharePercentage !== undefined && assignment.status === 'ended') throw new ApiError(400, 'Ended assignment cannot be changed');
  if (body.sharePercentage !== undefined && await ContractorSettlement.exists({ 'workerItems.assignmentId': assignment._id, status: 'paid' })) throw new ApiError(400, 'Assignment used by a paid settlement cannot be changed');
  const to = body.effectiveTo !== undefined ? end(body.effectiveTo) : assignment.effectiveTo;
  if (to && to < assignment.effectiveFrom) throw new ApiError(400, 'effectiveTo must be on or after effectiveFrom');
  if (body.effectiveTo !== undefined || body.sharePercentage !== undefined) {
    const others = await ContractorWorkerAssignment.find({ workerId: assignment.workerId, _id: { $ne: assignment._id }, status: 'active' });
    if (others.some((a) => overlap(assignment.effectiveFrom, to, a.effectiveFrom, a.effectiveTo))) throw new ApiError(409, 'Worker assignment overlaps an existing assignment');
  }
  if (body.effectiveTo !== undefined) { assignment.effectiveTo = to; if (to) { assignment.status = 'ended'; assignment.endedBy = actorId; assignment.endedAt = new Date(); } }
  if (body.sharePercentage !== undefined) assignment.sharePercentage = body.sharePercentage;
  if (body.reason !== undefined) assignment.reason = body.reason;
  return assignment.save();
};
module.exports = { create, getForDate, history, update, day };
