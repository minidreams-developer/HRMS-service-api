const catchAsync = require('../utils/catchAsync'); const pick = require('../utils/pick'); const ApiError = require('../utils/ApiError'); const service = require('../services/contractorSettlement.service');
const guard = (req) => { if (!service.management.has(req.user.role)) throw new ApiError(403, 'Only management may manage contractor settlements'); };
const process = catchAsync(async (req, res) => { guard(req); res.send(await service.process(req.params.contractorId, req.body.month, req.body.year, req.user._id)); });
const status = catchAsync(async (req, res) => { guard(req); res.send(await service.markPaid(req.params.settlementId, req.user._id)); });
const list = catchAsync(async (req, res) => { guard(req); const q = pick(req.query, ['contractorId', 'month', 'year', 'status']); const o = { page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 10, sortBy: req.query.sortBy }; res.send(await service.list(q, o)); });
const detail = catchAsync(async (req, res) => { guard(req); const result = await service.detail(req.params.settlementId); if (!result) throw new ApiError(404, 'Settlement not found'); res.send(result); });
const earnings = catchAsync(async (req, res) => { guard(req); const f = pick(req.query, ['year', 'status']); const o = { page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 10 }; res.send(await service.earnings(req.params.contractorId, f, o)); });
module.exports = { process, status, list, detail, earnings };
