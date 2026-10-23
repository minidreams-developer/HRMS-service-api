const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { shiftService } = require('../services');
const managementRoles = new Set(['manager', 'hr_manager', 'subAdmin', 'admin']);
const requireManagement = (req) => { if (!managementRoles.has(req.user.role)) throw new ApiError(httpStatus.FORBIDDEN, 'Only management may manage shifts'); };

const createShift = catchAsync(async (req, res) => {
  requireManagement(req);
  const shift = await shiftService.createShift(req.body, req.user);
  res.status(httpStatus.CREATED).send(shift);
});

const getShifts = catchAsync(async (req, res) => {
  const filter  = pick(req.query, ['search', 'shiftName', 'shiftCode', 'shiftType', 'shiftTypes', 'isShiftActive', 'userId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result  = await shiftService.queryShifts(filter, options);
  res.send(result);
});

const getShift = catchAsync(async (req, res) => {
  const shift = await shiftService.getShiftById(req.params.shiftId);
  if (!shift) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Shift not found');
  }
  res.send(shift);
});

const updateShift = catchAsync(async (req, res) => {
  requireManagement(req);
  const shift = await shiftService.updateShiftById(req.params.shiftId, req.body, req.user);
  res.send(shift);
});

const deleteShift = catchAsync(async (req, res) => {
  requireManagement(req);
  await shiftService.deleteShiftById(req.params.shiftId, req.user);
  res.status(httpStatus.NO_CONTENT).send();
});

const generateShiftId = catchAsync(async (req, res) => {
  const shiftCode = await shiftService.generateUniqueShiftId();
  res.send({ shiftCode });
});

module.exports = {
  createShift,
  getShifts,
  getShift,
  updateShift,
  deleteShift,
  generateShiftId,
};
