const catchAsync = require('../utils/catchAsync');
const pick = require('../utils/pick');
const { timesheetService } = require('../services');

const getStats = catchAsync(async (req, res) => {
  res.send(await timesheetService.getStats(req.query.date, req.query.role));
});

const getQuickStats = catchAsync(async (req, res) => {
  res.send(await timesheetService.getQuickStats(req.query));
});

const getDay = catchAsync(async (req, res) => {
  res.send(await timesheetService.getDay(pick(req.query, ['date', 'role', 'search', 'departmentId', 'departmentIds', 'designation', 'designationIds', 'shiftId', 'shiftIds', 'status', 'page', 'limit', 'sortBy'])));
});

const getWeek = catchAsync(async (req, res) => {
  res.send(await timesheetService.getWeek(pick(req.query, ['startDate', 'role', 'search', 'departmentId', 'departmentIds', 'designation', 'designationIds', 'shiftId', 'shiftIds', 'page', 'limit', 'sortBy'])));
});

const getDateDetail = catchAsync(async (req, res) => {
  res.send(await timesheetService.getDateDetail(req.params.employeeId, req.params.date));
});

module.exports = { getStats, getQuickStats, getDay, getWeek, getDateDetail };
