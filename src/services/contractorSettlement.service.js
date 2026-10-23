const mongoose = require('mongoose');
const { User, Payroll, ContractorSettlement } = require('../models');
const assignmentService = require('./contractorWorkerAssignment.service');
const ApiError = require('../utils/ApiError');

const management = new Set(['manager', 'hr_manager', 'subAdmin', 'admin']);
const validateContractor = async (id) => { const c = await User.findOne({ _id: id, role: 'contractor' }); if (!c) throw new ApiError(404, 'Contractor not found'); return c; };
const process = async (contractorId, month, year, actorId) => {
  const contractor = await validateContractor(contractorId); if (contractor.isDeleted || contractor.isActive !== 'Active') throw new ApiError(400, 'Inactive or deleted contractor cannot be processed');
  const start = new Date(Date.UTC(year, month - 1, 1)); const end = new Date(Date.UTC(year, month, 0));
  const assignments = await require('../models').ContractorWorkerAssignment.find({ contractorId, effectiveFrom: { $lte: end }, $or: [{ effectiveTo: null }, { effectiveTo: { $gte: start } }] }).populate('workerId').lean();
  const workerItems = []; const skippedWorkers = [];
  const byWorker = new Map(); assignments.forEach((a) => { const k = String(a.workerId._id); if (!byWorker.has(k)) byWorker.set(k, []); byWorker.get(k).push(a); });
  for (const workerAssignments of byWorker.values()) {
    const allMonthAssignments = await require('../models').ContractorWorkerAssignment.find({ workerId: workerAssignments[0].workerId._id, effectiveFrom: { $lte: end }, $or: [{ effectiveTo: null }, { effectiveTo: { $gte: start } }] }).lean();
    if (allMonthAssignments.length > 1) { skippedWorkers.push({ workerId: workerAssignments[0].workerId._id, reason: 'Multiple contractor assignments in same payroll month require manual resolution' }); continue; }
    const a = workerAssignments[0];
    const payroll = await Payroll.findOne({ employeeId: a.workerId._id, month, year, status: { $in: ['processed', 'paid'] } }).lean();
    if (!payroll || payroll.snapshot?.earnedWages === undefined) { skippedWorkers.push({ workerId: a.workerId._id, reason: 'Payroll not processed' }); continue; }
    const salaryAmount = Number(payroll.snapshot.earnedWages) || 0; const calculatedShare = Number((salaryAmount * a.sharePercentage / 100).toFixed(2));
    workerItems.push({ workerId: a.workerId._id, payrollId: payroll._id, assignmentId: a._id, workerSnapshot: { id: a.workerId._id, employeeCode: a.workerId.employeeId, name: a.workerId.name, role: a.workerId.role, branch: a.workerId.workInformation?.branch, department: a.workerId.workInformation?.department }, salaryBasis: 'earnedWages', salaryAmount, sharePercentage: a.sharePercentage, calculatedShare });
  }
  const update = { workerItems, skippedWorkers, totalShare: Number(workerItems.reduce((s, i) => s + i.calculatedShare, 0).toFixed(2)), status: 'processed', processedBy: actorId, processedAt: new Date() };
  const existing = await ContractorSettlement.findOne({ contractorId, month, year }); if (existing?.status === 'paid') throw new ApiError(400, 'Paid settlement is immutable');
  return ContractorSettlement.findOneAndUpdate({ contractorId, month, year }, { $set: update, $setOnInsert: { contractorId, month, year } }, { new: true, upsert: true, runValidators: true });
};
const markPaid = async (id, actorId) => { const s = await ContractorSettlement.findById(id); if (!s) throw new ApiError(404, 'Settlement not found'); if (s.status !== 'processed') throw new ApiError(400, 'Only processed settlements can be paid'); s.status = 'paid'; s.paidBy = actorId; s.paidAt = new Date(); return s.save(); };
const list = async (filter, options) => {
  const { parseSort } = require('../utils/queryFilters');
  const query = { ...(filter.contractorId ? { contractorId: filter.contractorId } : {}), ...(filter.month ? { month: filter.month } : {}), ...(filter.year ? { year: filter.year } : {}), ...(filter.status ? { status: filter.status } : {}) };
  if (filter.fromDate || filter.toDate) {
    const range = {};
    if (filter.fromDate) range.$gte = new Date(filter.fromDate);
    if (filter.toDate) range.$lte = new Date(new Date(filter.toDate).setUTCHours(23, 59, 59, 999));
    query.$or = [{ processedAt: range }, { paidAt: range }];
  }
  const sort = parseSort(options.sortBy, ['createdAt', 'processedAt', 'paidAt', 'totalShare', 'month', 'year', 'status'], { year: -1, month: -1 });
  const sortBy = Object.entries(sort).map(([field, direction]) => `${field}:${direction === -1 ? 'desc' : 'asc'}`).join(',');
  return ContractorSettlement.paginate(query, { ...options, sortBy });
};
const detail = async (id) => ContractorSettlement.findById(id).populate('contractorId', 'name employeeId role isActive isDeleted');
const earnings = async (contractorId, filter, options) => { const rows = await ContractorSettlement.find({ contractorId, ...filter }).sort({ year: -1, month: -1 }).skip((options.page - 1) * options.limit).limit(options.limit).lean(); const totalResults = await ContractorSettlement.countDocuments({ contractorId, ...filter }); return { results: rows.map((r) => ({ month: r.month, year: r.year, workerCount: r.workerItems.length, totalShare: r.totalShare, status: r.status, processedAt: r.processedAt, paidAt: r.paidAt })), page: options.page, limit: options.limit, totalResults, totalPages: Math.ceil(totalResults / options.limit) }; };
module.exports = { process, markPaid, list, detail, earnings, management };
