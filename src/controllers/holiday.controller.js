const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { holidayService } = require('../services');

const createHoliday = catchAsync(async (req, res) => {
  const holiday = await holidayService.createHoliday(req.body, req.user._id);
  res.status(httpStatus.CREATED).send(holiday);
});

const getHolidays = catchAsync(async (req, res) => {
  const filter  = pick(req.query, ['search', 'holidayTitle', 'month', 'status', 'fromDate', 'toDate']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result  = await holidayService.queryHolidays(filter, options);
  res.send(result);
});

const getMyHolidays = catchAsync(async (req, res) => {
  let { fromDate, toDate } = req.query;
  if (req.query.year) { fromDate = `${req.query.year}-01-01`; toDate = `${req.query.year}-12-31`; }
  const holidays = await holidayService.getApplicableHolidays(req.user._id, fromDate, toDate);
  res.send(holidays.map(({ people, createdBy, updatedBy, deactivatedBy, ...holiday }) => holiday));
});

const getHoliday = catchAsync(async (req, res) => {
  const holiday = await holidayService.getHolidayById(req.params.holidayId);
  if (!holiday) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Holiday not found');
  }
  res.send(holiday);
});

const updateHoliday = catchAsync(async (req, res) => {
  const holiday = await holidayService.updateHolidayById(req.params.holidayId, req.body, req.user._id);
  res.send(holiday);
});

const deleteHoliday = catchAsync(async (req, res) => {
  await holidayService.deleteHolidayById(req.params.holidayId, req.user._id);
  res.status(httpStatus.NO_CONTENT).send();
});

const addPerson = catchAsync(async (req, res) => {
  const holiday = await holidayService.addPerson(req.params.holidayId, req.body.userId);
  res.send(holiday);
});

const removePerson = catchAsync(async (req, res) => {
  const holiday = await holidayService.removePerson(req.params.holidayId, req.body.userId);
  res.send(holiday);
});

module.exports = {
  createHoliday,
  getHolidays,
  getMyHolidays,
  getHoliday,
  updateHoliday,
  deleteHoliday,
  addPerson,
  removePerson,
};
