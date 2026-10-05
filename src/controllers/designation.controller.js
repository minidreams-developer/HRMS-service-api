const httpStatus = require('http-status'); const pick = require('../utils/pick'); const ApiError = require('../utils/ApiError'); const catchAsync = require('../utils/catchAsync'); const service = require('../services/designation.service');
const createDesignation = catchAsync(async (req, res) => res.status(httpStatus.CREATED).send(await service.createDesignation(req.body, req.user)));
const getDesignations = catchAsync(async (req, res) => res.send(await service.queryDesignations(pick(req.query, ['search', 'isActive', 'status']), pick(req.query, ['sortBy', 'page', 'limit']))));
const getDesignation = catchAsync(async (req, res) => { const d = await service.getDesignationById(req.params.designationId); if (!d) throw new ApiError(404, 'Designation not found'); res.send(d); });
const getDesignationDropdown = catchAsync(async (req, res) => res.send({ results: await service.getDesignationDropdown(req.query.search) }));
const updateDesignation = catchAsync(async (req, res) => res.send(await service.updateDesignationById(req.params.designationId, req.body, req.user)));
const deleteDesignation = catchAsync(async (req, res) => { await service.deleteDesignationById(req.params.designationId, req.user); res.status(204).send(); });
const generateDesignationCode = catchAsync(async (req, res) => res.send({ designationCode: await service.generateUniqueDesignationCode() }));
module.exports = { createDesignation, getDesignations, getDesignation, getDesignationDropdown, updateDesignation, deleteDesignation, generateDesignationCode };
