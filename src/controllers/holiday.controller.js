const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { holidayService } = require('../services');

const createHoliday = catchAsync(async (req, res) => {
  const holiday = await holidayService.createHoliday(req.body);
  res.status(httpStatus.CREATED).send(holiday);
});

const getHolidays = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['holidayTitle', 'month', 'status']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await holidayService.queryHolidays(filter, options);
  res.send(result);
});

const getHoliday = catchAsync(async (req, res) => {
  const holiday = await holidayService.getHolidayById(req.params.holidayId);
  if (!holiday) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Holiday not found');
  }
  res.send(holiday);
});

const updateHoliday = catchAsync(async (req, res) => {
  const holiday = await holidayService.updateHolidayById(req.params.holidayId, req.body);
  res.send(holiday);
});

const deleteHoliday = catchAsync(async (req, res) => {
  await holidayService.deleteHolidayById(req.params.holidayId);
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
  getHoliday,
  updateHoliday,
  deleteHoliday,
  addPerson,
  removePerson,
};
