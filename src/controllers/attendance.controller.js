const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { attendanceService } = require('../services');
const { roleRights } = require('../config/roles');
const managementRoles = new Set(['manager', 'hr_manager', 'subAdmin', 'admin']);

const canReadEmployeeAttendance = (req) => {
  const rights = roleRights.get(req.user.role) || [];
  return rights.includes('getUsers') || String(req.user._id || req.user.id) === String(req.params.employeeId);
};

const createAttendance = catchAsync(async (req, res) => {
  const attendance = await attendanceService.createAttendance(req.body);
  res.status(httpStatus.CREATED).send(attendance);
});

const getAttendances = catchAsync(async (req, res) => {
  const filter  = pick(req.query, ['search', 'employeeId', 'shiftId', 'date', 'attendanceStatus', 'timingStatus', 'attendanceCategory', 'fromDate', 'toDate']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result  = await attendanceService.queryAttendances(filter, options);
  res.send(result);
});

const getAttendance = catchAsync(async (req, res) => {
  const attendance = await attendanceService.getAttendanceById(req.params.attendanceId);
  if (!attendance) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Attendance not found');
  }
  res.send(attendance);
});

const getPresentEmployeesToday = catchAsync(async (req, res) => {
  if (!managementRoles.has(req.user.role)) throw new ApiError(httpStatus.FORBIDDEN, 'Only management may view present employees');
  res.send({ date: req.query.date || new Date().toISOString().slice(0, 10), role: req.query.role || 'employee,staff', results: await attendanceService.getPresentEmployeesToday(req.query.date, req.query.role) });
});

const getEmployeeAttendanceSummary = catchAsync(async (req, res) => {
  if (!canReadEmployeeAttendance(req)) throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  const summary = await attendanceService.getEmployeeAttendanceSummary(
    req.params.employeeId,
    req.query.fromDate,
    req.query.toDate,
  );
  res.send(summary);
});

const getEmployeeAttendance = catchAsync(async (req, res) => {
  if (!canReadEmployeeAttendance(req)) throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  const filter = pick(req.query, ['date', 'fromDate', 'toDate', 'attendanceCategory', 'timingStatus']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  res.send(await attendanceService.getEmployeeAttendance(req.params.employeeId, filter, options));
});

const getEmployeeCalendar = catchAsync(async (req, res) => {
  if (!canReadEmployeeAttendance(req)) throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  res.send(await attendanceService.getEmployeeCalendar(req.params.employeeId, req.query.fromDate, req.query.toDate));
});

const updateAttendance = catchAsync(async (req, res) => {
  const attendance = await attendanceService.updateAttendanceById(req.params.attendanceId, req.body, req.user._id || req.user.id);
  res.send(attendance);
});

const deleteAttendance = catchAsync(async (req, res) => {
  await attendanceService.deleteAttendanceById(req.params.attendanceId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createAttendance,
  getAttendances,
  getAttendance,
  getPresentEmployeesToday,
  getEmployeeAttendanceSummary,
  getEmployeeAttendance,
  getEmployeeCalendar,
  updateAttendance,
  deleteAttendance,
};
