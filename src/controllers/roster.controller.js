const httpStatus = require('http-status');
const pick = require('../utils/pick');
const catchAsync = require('../utils/catchAsync');
const { rosterService } = require('../services');

const create = catchAsync(async (req, res) => res.status(httpStatus.CREATED).send(await rosterService.createRoster(req.body, req.user)));
const bulk = catchAsync(async (req, res) => res.status(httpStatus.CREATED).send(await rosterService.createBulk(req.body, req.user)));
const list = catchAsync(async (req, res) => res.send(await rosterService.queryRoster(req.query, pick(req.query, ['sortBy', 'limit', 'page']))));
const day = catchAsync(async (req, res) => res.send(await rosterService.getDayView(req.params.date, req.query)));
const employee = catchAsync(async (req, res) => res.send(await rosterService.getEmployeeView(req.params.employeeId, req.query.fromDate, req.query.toDate)));
const update = catchAsync(async (req, res) => res.send(await rosterService.updateRoster(req.params.rosterId, req.body, req.user)));
const remove = catchAsync(async (req, res) => res.send(await rosterService.cancelRoster(req.params.rosterId, req.user)));
module.exports = { create, bulk, list, day, employee, update, remove };
