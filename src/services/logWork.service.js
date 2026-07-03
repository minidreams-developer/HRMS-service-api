const httpStatus = require('http-status');
const mongoose = require('mongoose');
const LogWork = require('../models/logWork.model');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isObjectId = (val) =>
  mongoose.Types.ObjectId.isValid(val) &&
  String(new mongoose.Types.ObjectId(val)) === String(val);

/**
 * Compute per-item totals and grand total from the jobItems array.
 * Mutates the items in place and returns the grandTotal.
 * @param {Array} jobItems
 * @returns {number} grandTotal
 */
const computeTotals = (jobItems = []) => {
  let grandTotal = 0;
  for (const item of jobItems) {
    item.total = (item.quantity || 0) * (item.pricePerUnit || 0);
    grandTotal += item.total;
  }
  return grandTotal;
};

/**
 * Populate branch and contractorJobItem refs on a log document.
 * @param {Document} doc
 */
const populateLog = async (doc) => {
  await LogWork.populate(doc, [
    { path: 'contractorId', select: 'name employeeId email' },
    { path: 'branch', select: 'branchName' },
    { path: 'jobItems.contractorJobItem', select: 'jobItems unit price region' },
  ]);
};

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a work log entry for a contractor.
 * Accepts contractorId as either a MongoDB _id or an employeeId (CTR-XXXXXX).
 *
 * @param {Object} body
 * @returns {Promise<LogWork>}
 */
const createLogWork = async (body) => {
  // Resolve contractor — accept ObjectId or employeeId string
  const contractorIdTrimmed = (body.contractorId || '').trim();
  
  let contractor;
  if (isObjectId(contractorIdTrimmed)) {
    contractor = await User.findOne({ _id: contractorIdTrimmed, role: 'contractor' });
  } else {
    contractor = await User.findOne({ employeeId: contractorIdTrimmed, role: 'contractor' });
  }

  if (!contractor) {
    // Enhanced error message for debugging
    throw new ApiError(
      httpStatus.NOT_FOUND,
      `Contractor not found with ${isObjectId(contractorIdTrimmed) ? '_id' : 'employeeId'}: "${contractorIdTrimmed}"`
    );
  }

  // Compute totals before saving
  const jobItems = body.jobItems || [];
  const grandTotal = computeTotals(jobItems);

  const logData = {
    contractorId: contractor._id,
    branch: body.branch,
    entryDate: body.entryDate || Date.now(),
    workDoneDate: body.workDoneDate,
    reference: body.reference,
    jobItems,
    attachments: body.attachments || [],
    grandTotal,
  };

  const log = await LogWork.create(logData);
  await populateLog(log);
  return log;
};

// ─── Query ────────────────────────────────────────────────────────────────────

/**
 * List all work log entries with pagination.
 * @param {Object} filter  - Mongo filter
 * @param {Object} options - Paginate options (sortBy, limit, page)
 * @returns {Promise<QueryResult>}
 */
const queryLogWork = async (filter, options) => {
  const result = await LogWork.paginate(filter, options);
  for (const doc of result.results) {
    await populateLog(doc);
  }
  return result;
};

/**
 * Get all work log entries for a specific contractor.
 * Accepts MongoDB _id or employeeId (CTR-XXXXXX).
 *
 * @param {string} contractorId
 * @param {Object} options - Paginate options
 * @returns {Promise<QueryResult>}
 */
const getLogsByContractor = async (contractorId, options) => {
  // Resolve to MongoDB _id first
  let resolvedId;
  if (isObjectId(contractorId)) {
    resolvedId = contractorId;
  } else {
    const contractor = await User.findOne({
      employeeId: contractorId.trim(),
      role: 'contractor',
    }).select('_id');
    if (!contractor) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Contractor not found');
    }
    resolvedId = contractor._id;
  }

  return queryLogWork({ contractorId: resolvedId }, options);
};

// ─── Get by ID ────────────────────────────────────────────────────────────────

/**
 * Get a single work log entry by its _id.
 * @param {ObjectId} logId
 * @returns {Promise<LogWork>}
 */
const getLogWorkById = async (logId) => {
  const log = await LogWork.findById(logId);
  if (!log) return null;
  await populateLog(log);
  return log;
};

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Update a work log entry by its _id.
 * Recomputes totals if jobItems are included in the update.
 *
 * @param {ObjectId} logId
 * @param {Object} updateBody
 * @returns {Promise<LogWork>}
 */
const updateLogWorkById = async (logId, updateBody) => {
  const log = await getLogWorkById(logId);
  if (!log) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Work log entry not found');
  }

  // If jobItems are being updated, recompute totals
  if (updateBody.jobItems) {
    updateBody.grandTotal = computeTotals(updateBody.jobItems);
  }

  Object.assign(log, updateBody);
  await log.save();
  await populateLog(log);
  return log;
};

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Delete a work log entry by its _id.
 * @param {ObjectId} logId
 * @returns {Promise<LogWork>}
 */
const deleteLogWorkById = async (logId) => {
  const log = await LogWork.findById(logId);
  if (!log) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Work log entry not found');
  }
  await log.remove();
  return log;
};

module.exports = {
  createLogWork,
  queryLogWork,
  getLogsByContractor,
  getLogWorkById,
  updateLogWorkById,
  deleteLogWorkById,
};
