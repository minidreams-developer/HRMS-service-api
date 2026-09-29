const catchAsync = require('../utils/catchAsync'); const ApiError = require('../utils/ApiError'); const service = require('../services/contractorWorkerAssignment.service');
const management = new Set(['manager', 'hr_manager', 'subAdmin', 'admin']); const guard = (req) => { if (!management.has(req.user.role)) throw new ApiError(403, 'Only management may manage contractor assignments'); };
const create = catchAsync(async (req, res) => { guard(req); res.status(201).send(await service.create(req.body, req.user._id)); });
const update = catchAsync(async (req, res) => { guard(req); res.send(await service.update(req.params.assignmentId, req.body, req.user._id)); });
const history = catchAsync(async (req, res) => { guard(req); res.send(await service.history(req.params.workerId)); });
module.exports = { create, update, history };
