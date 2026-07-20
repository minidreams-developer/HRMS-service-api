const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const adjustmentService = require('../services/adjustment.service');

/**
 * GET /v1/adjustments/quick-stats?month=&year=
 * Quick stats: total additions, total deductions, pending approvals, applied to payroll
 */
const getQuickStats = catchAsync(async (req, res) => {
  const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();
  const stats = await adjustmentService.getQuickStats(month, year);
  res.send(stats);
});

/**
 * POST /v1/adjustments
 * Create a new adjustment (for a person or an entire team).
 */
const createAdjustment = catchAsync(async (req, res) => {
  // createdBy — use logged-in user if available, else skip
  const createdById = req.user?._id || null;
  const adjustment = await adjustmentService.createAdjustment(req.body, createdById);
  res.status(httpStatus.CREATED).send(adjustment);
});

/**
 * GET /v1/adjustments
 * List all adjustments with filters and pagination.
 * Query: month, year, status, type, component, search, sortBy, limit, page
 */
const getAdjustments = catchAsync(async (req, res) => {
  const query = pick(req.query, ['month', 'year', 'status', 'type', 'component', 'search']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await adjustmentService.queryAdjustments(query, options);
  res.send(result);
});

/**
 * GET /v1/adjustments/pending
 * List only pending adjustments (shortcut for the Pending tab).
 */
const getPendingAdjustments = catchAsync(async (req, res) => {
  const query = {
    ...pick(req.query, ['month', 'year', 'type', 'component', 'search']),
    status: 'pending',
  };
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await adjustmentService.queryAdjustments(query, options);
  res.send(result);
});

/**
 * GET /v1/adjustments/:adjustmentId
 * Get a single adjustment by its _id (Adjustment Details panel).
 */
const getAdjustment = catchAsync(async (req, res) => {
  const adjustment = await adjustmentService.getAdjustmentById(req.params.adjustmentId);
  if (!adjustment) throw new ApiError(httpStatus.NOT_FOUND, 'Adjustment not found');
  res.send(adjustment);
});

/**
 * PATCH /v1/adjustments/:adjustmentId
 * Update editable fields (only allowed when status is draft or pending).
 */
const updateAdjustment = catchAsync(async (req, res) => {
  const adjustment = await adjustmentService.updateAdjustmentById(req.params.adjustmentId, req.body);
  res.send(adjustment);
});

/**
 * PATCH /v1/adjustments/:adjustmentId/status
 * Update status: approve (✓), reject (✗), cancel, apply.
 * Body: { status: "approved" | "rejected" | "canceled" | "applied" }
 */
const updateAdjustmentStatus = catchAsync(async (req, res) => {
  const adjustment = await adjustmentService.updateAdjustmentStatus(
    req.params.adjustmentId,
    req.body.status
  );
  res.send(adjustment);
});

/**
 * DELETE /v1/adjustments/:adjustmentId
 * Delete an adjustment.
 */
const deleteAdjustment = catchAsync(async (req, res) => {
  await adjustmentService.deleteAdjustmentById(req.params.adjustmentId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  getQuickStats,
  createAdjustment,
  getAdjustments,
  getPendingAdjustments,
  getAdjustment,
  updateAdjustment,
  updateAdjustmentStatus,
  deleteAdjustment,
};
