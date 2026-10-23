const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const contractorService = require('../services/contractor.service');
const authRoles = new Set(['manager', 'hr_manager', 'subAdmin', 'admin']);
const guard = (req) => { if (!authRoles.has(req.user.role)) throw new ApiError(httpStatus.FORBIDDEN, 'Only management may manage contractors'); };

/**
 * POST /v1/contractors/register
 * Register a new contractor with personal info, address,
 * emergency contacts, and job items in one shot.
 */
const registerContractor = catchAsync(async (req, res) => {
  guard(req);
  const contractor = await contractorService.registerContractor(req.body);
  res.status(httpStatus.CREATED).send(contractor);
});

/**
 * GET /v1/contractors/generate-id
 * Returns a unique pre-generated contractor ID (CTR-XXXXXX).
 */
const generateContractorId = catchAsync(async (req, res) => {
  guard(req);
  const contractorId = await contractorService.generateContractorId();
  res.send({ contractorId });
});

/**
 * GET /v1/contractors
 * List all contractors with pagination.
 * Query params: name, sortBy, limit, page
 */
const getContractors = catchAsync(async (req, res) => {
  guard(req);
  const filter = pick(req.query, ['name', 'status', 'departmentId', 'branchId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await contractorService.queryContractors(filter, options);
  res.send(result);
});

/**
 * GET /v1/contractors/:contractorId
 * Get a single contractor by their user _id.
 */
const getContractor = catchAsync(async (req, res) => {
  guard(req);
  const contractor = await contractorService.getContractorById(req.params.contractorId);
  if (!contractor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Contractor not found');
  }
  res.send(contractor);
});

/**
 * PATCH /v1/contractors/:contractorId
 * Partial update of a contractor document.
 */
const updateContractor = catchAsync(async (req, res) => {
  guard(req);
  const contractor = await contractorService.updateContractorById(req.params.contractorId, req.body);
  res.send(contractor);
});

/**
 * DELETE /v1/contractors/:contractorId
 * Remove a contractor permanently.
 */
const deleteContractor = catchAsync(async (req, res) => {
  guard(req);
  await contractorService.deleteContractorById(req.params.contractorId);
  res.status(httpStatus.NO_CONTENT).send();
});

const getContractorWorkers = catchAsync(async (req, res) => { guard(req); res.send(await contractorService.getContractorWorkers(req.params.contractorId, req.query, { page: req.query.page, limit: req.query.limit })); });
const getContractorEarnings = catchAsync(async (req, res) => { guard(req); const { contractorSettlementService } = require('../services'); const result = await contractorSettlementService.earnings(req.params.contractorId, pick(req.query, ['year', 'status']), { page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 10 }); res.send(result); });

module.exports = {
  registerContractor,
  generateContractorId,
  getContractors,
  getContractor,
  updateContractor,
  deleteContractor,
  getContractorWorkers,
  getContractorEarnings,
};
