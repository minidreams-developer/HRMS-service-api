const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { LeaveRequests, LeaveBalance, User, Shift, Holiday, DayOff } = require('../models');
const { getApplicableHolidays } = require('./holiday.service');
const { getEmployeeShiftForDate } = require('./shiftAssignment.service');
const { getEffectiveShiftForDate } = require('./roster.service');
const ApiError = require('../utils/ApiError');

const utcDay = (value) => {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};
const endOfDay = (value) => new Date(utcDay(value).getTime() + 86399999);
const dateRange = (start, end) => {
  const dates = [];
  for (let date = utcDay(start); date <= utcDay(end); date = new Date(date.getTime() + 86400000)) dates.push(new Date(date));
  return dates;
};
const key = (date) => utcDay(date).toISOString().slice(0, 10);
const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const getRequestDates = (body) => {
  const hasSingle = Boolean(body.singleDate);
  const hasRange = Boolean(body.startDate || body.endDate);
  if (hasSingle === hasRange || (hasRange && (!body.startDate || !body.endDate))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Provide either singleDate or startDate and endDate');
  }
  const start = utcDay(hasSingle ? body.singleDate : body.startDate);
  const end = utcDay(hasSingle ? body.singleDate : body.endDate);
  if (end < start) throw new ApiError(httpStatus.BAD_REQUEST, 'endDate must be on or after startDate');
  if (body.leaveDuration === 'halfDay' && (!hasSingle || !body.halfDaySession)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Half-day leave requires a singleDate and halfDaySession');
  }
  if (body.leaveDuration === 'fullDay' && body.halfDaySession) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'halfDaySession is only valid for half-day leave');
  }
  return { start, end };
};

const getEmployeeContext = async (employeeId, effectiveDate = new Date()) => {
  const employee = await User.findById(employeeId).lean();
  if (!employee) throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  if (employee.isActive !== 'Active') throw new ApiError(httpStatus.BAD_REQUEST, 'Relieved employee cannot create Leave request');
  const shift = employee?._id ? await getEmployeeShiftForDate(employee._id, effectiveDate) : null;
  return { employee, shift };
};

const calculateLeaveDays = async (employeeId, start, end, leaveDuration = 'fullDay') => {
  const dates = dateRange(start, end);
  const [holidays, dayOffs] = await Promise.all([
    getApplicableHolidays(employeeId, start, end),
    DayOff.find({ employeeId, status: true, date: { $gte: start, $lte: endOfDay(end) } }).lean(),
  ]);
  const holidayKeys = new Set(holidays.map((holiday) => key(holiday.date)));
  const dayOffKeys = new Set(dayOffs.map((record) => key(record.date)));
  const workingDates = [];
  for (const date of dates) {
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toLowerCase();
    const shift = await getEffectiveShiftForDate(employeeId, date);
    const weekOff = (shift?.weekOff || []).map((value) => String(value).toLowerCase()).includes(weekday);
    if (!holidayKeys.has(key(date)) && !dayOffKeys.has(key(date)) && !weekOff) workingDates.push(date);
  }
  if (leaveDuration === 'halfDay') return workingDates.length ? 0.5 : 0;
  return workingDates.length;
};

const rangesOverlap = (aStart, aEnd, bStart, bEnd) => aStart <= bEnd && bStart <= aEnd;

const hasOverlap = async (body, excludeId = null) => {
  const { start, end } = getRequestDates(body);
  const existing = await LeaveRequests.find({
    employeeId: body.employeeId,
    status: { $in: ['pending', 'approved'] },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).lean();
  for (const leave of existing) {
    const otherStart = utcDay(leave.singleDate || leave.startDate);
    const otherEnd = utcDay(leave.singleDate || leave.endDate || leave.startDate);
    if (!rangesOverlap(start, end, otherStart, otherEnd)) continue;
    if (start.getTime() !== end.getTime() || otherStart.getTime() !== otherEnd.getTime()) return true;
    if (body.leaveDuration === 'halfDay' && leave.leaveDuration === 'halfDay' && body.halfDaySession !== leave.halfDaySession) continue;
    return true;
  }
  return false;
};

const isUnpaid = (leaveType) => String(leaveType || '').trim().toLowerCase() === 'unpaid leave';

const consumeBalance = async (leave, amount, session = null) => {
  if (isUnpaid(leave.leaveType)) return [];
  const start = utcDay(leave.singleDate || leave.startDate);
  const end = utcDay(leave.singleDate || leave.endDate || leave.startDate);
  const years = [];
  for (let year = start.getUTCFullYear(); year <= end.getUTCFullYear(); year += 1) years.push(year);
  const balances = [];
  const usage = [];
  let remainingAmount = amount;
  for (const year of years) {
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year, 11, 31));
    const segmentStart = start > yearStart ? start : yearStart;
    const segmentEnd = end < yearEnd ? end : yearEnd;
    const segmentAmount = leave.leaveDuration === 'halfDay'
      ? amount
      : await calculateLeaveDays(leave.employeeId, segmentStart, segmentEnd, leave.leaveDuration);
    if (!segmentAmount) continue;
    const normalizedType = String(leave.leaveType || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const balance = await LeaveBalance.findOne({
      employeeId: leave.employeeId,
      leaveType: { $regex: `^${normalizedType}$`, $options: 'i' },
      year,
    }).session(session);
    if (balance && !balance.requiresBalance) {
      remainingAmount -= segmentAmount;
      continue;
    }
    if (!balance || balance.remaining < segmentAmount) {
      throw new ApiError(httpStatus.BAD_REQUEST, `No sufficient configured leave balance for ${year}`);
    }
    balances.push({ balance, amount: segmentAmount });
    usage.push({ year, leaveType: balance.leaveType, amount: segmentAmount });
    remainingAmount -= segmentAmount;
  }
  if (remainingAmount > 0.000001) throw new ApiError(httpStatus.BAD_REQUEST, 'No sufficient configured leave balance');
  for (const item of balances) {
    item.balance.used = Number((item.balance.used + item.amount).toFixed(2));
    await item.balance.save({ session });
  }
  return usage;
};

const restoreBalance = async (leave) => {
  if (!leave.balanceUsageRecorded) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Approved leave has no safe balance-usage history for restoration');
  }
  if (!Array.isArray(leave.balanceUsage) || leave.balanceUsage.length === 0) return;
  const balances = [];
  for (const usage of leave.balanceUsage) {
    const normalizedType = String(usage.leaveType || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const balance = await LeaveBalance.findOne({
      employeeId: leave.employeeId,
      leaveType: { $regex: `^${normalizedType}$`, $options: 'i' },
      year: usage.year,
    });
    if (!balance || balance.used < usage.amount) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Unable to safely restore leave balance for ${usage.year}`);
    }
    balances.push({ balance, amount: usage.amount });
  }
  for (const item of balances) {
    item.balance.used = Number((item.balance.used - item.amount).toFixed(2));
    await item.balance.save();
  }
};

/**
 * Create a leave request
 * @param {Object} body
 * @returns {Promise<LeaveRequests>}
 */
const createLeaveRequests = async (body) => {
  const employeeId = isObjectId(body.employeeId) ? new mongoose.Types.ObjectId(body.employeeId) : body.employeeId;
  const dates = getRequestDates(body);
  const { shift } = await getEmployeeContext(employeeId, dates.start);
  const payload = { ...body, employeeId, singleDate: null, startDate: null, endDate: null };
  if (body.singleDate) payload.singleDate = dates.start;
  else {
    payload.startDate = dates.start;
    payload.endDate = dates.end;
  }
  payload.leaveDuration = body.leaveDuration || 'fullDay';
  if (await hasOverlap(payload)) throw new ApiError(httpStatus.CONFLICT, 'Leave request overlaps an existing pending or approved leave');
  payload.status = 'pending';
  payload.leaveDays = await calculateLeaveDays(employeeId, dates.start, dates.end, payload.leaveDuration);
  payload.shiftWeekOffSnapshot = shift?.weekOff || [];
  payload.statusHistory = [{ status: 'pending', changedAt: new Date() }];
  return LeaveRequests.create(payload);
};

/**
 * Query for leave requests with search and filter support.
 *
 * Filter keys:
 *   search       — regex across linked user's name, email, employeeId
 *   employeeId   — exact ObjectId match
 *   role         — filter by linked user's role: employee | staff
 *   leaveType    — partial case-insensitive match
 *   status       — 'pending' | 'approved' | 'ended'
 *   departmentId — exact ObjectId match on department field
 *   fromDate     — leave starts on or after this date
 *   toDate       — leave starts on or before this date
 *
 * @param {Object} filter
 * @param {Object} options - sortBy, limit, page
 * @returns {Promise<QueryResult>}
 */
const queryLeaveRequests = async (filter, options) => {
  const mongoose = require('mongoose');
  const { User } = require('../models');
  const mongoFilter = {};

  // Resolve the role filter to leave-request employee IDs.
  if (filter.role) {
    const roleUsers = await User.find({ role: filter.role }, { _id: 1 }).lean();
    mongoFilter.employeeId = { $in: roleUsers.map((user) => user._id) };
  }

  // Search — resolve user IDs first
  if (filter.search) {
    const regex = { $regex: filter.search, $options: 'i' };
    const matchedUsers = await User.find(
      { $or: [{ name: regex }, { email: regex }, { employeeId: regex }] },
      { _id: 1 }
    ).lean();
    const userIds = matchedUsers.map((u) => u._id);
    mongoFilter.employeeId = mongoFilter.employeeId
      ? { $in: userIds.filter((id) => mongoFilter.employeeId.$in.some((roleId) => String(roleId) === String(id))) }
      : { $in: userIds };
  }

  // Direct employeeId filter
  if (filter.employeeId) mongoFilter.employeeId = isObjectId(filter.employeeId) ? new mongoose.Types.ObjectId(filter.employeeId) : filter.employeeId;

  // Leave type filter — partial match
  if (filter.leaveType) {
    mongoFilter.leaveType = { $regex: filter.leaveType, $options: 'i' };
  }

  // Status filter
  if (filter.status) {
    mongoFilter.status = filter.status;
  }

  // Department filter
  if (filter.departmentId) {
    mongoFilter.department = filter.departmentId;
  }

  // Date range — match any leave that overlaps the requested period.
  if (filter.fromDate || filter.toDate) {
    const from = filter.fromDate ? utcDay(filter.fromDate) : new Date(0);
    const to = filter.toDate ? endOfDay(filter.toDate) : new Date('9999-12-31T23:59:59.999Z');
    mongoFilter.$or = [
      { singleDate: { $gte: from, $lte: to } },
      { startDate: { $lte: to }, endDate: { $gte: from } },
    ];
  }

  if (filter.year) {
    const yearStart = new Date(Date.UTC(Number(filter.year), 0, 1));
    const yearEnd = new Date(Date.UTC(Number(filter.year), 11, 31, 23, 59, 59, 999));
    mongoFilter.$and = (mongoFilter.$and || []).concat({ $or: [
      { singleDate: { $gte: yearStart, $lte: yearEnd } },
      { startDate: { $lte: yearEnd }, endDate: { $gte: yearStart } },
    ] });
  }

  const populateOptions = { ...options, populate: 'employeeId,department,approvedBy,rejectedBy,cancelledBy' };
  const result = await LeaveRequests.paginate(mongoFilter, populateOptions);
  return result;
};

/**
 * Get leave request by id
 * @param {ObjectId} id
 * @returns {Promise<LeaveRequests>}
 */
const getLeaveRequestsById = async (id) => {
  return LeaveRequests.findById(id).populate('employeeId', 'name employeeId email').populate('department', 'departmentName departmentCode');
};

/**
 * Get leave requests by employeeId
 * @param {ObjectId} employeeId
 * @returns {Promise<LeaveRequests[]>}
 */
const getLeaveRequestsByEmployee = async (employeeId, options) => {
  return queryLeaveRequests({ employeeId }, options);
};

/**
 * Update leave request by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<LeaveRequests>}
 */
const updateLeaveRequestsById = async (id, updateBody) => {
  const leaveRequest = await getLeaveRequestsById(id);
  if (!leaveRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Leave request not found');
  }
  Object.assign(leaveRequest, updateBody);
  await leaveRequest.save();
  return leaveRequest;
};

/**
 * Update leave request status (approve / reject)
 * @param {ObjectId} id
 * @param {string} status
 * @returns {Promise<LeaveRequests>}
 */
const updateLeaveStatus = async (id, status, changedBy = null, reason = null) => {
  const leaveRequest = await LeaveRequests.findById(id);
  if (!leaveRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Leave request not found');
  }
  if (status === 'cancelled' && leaveRequest.status === 'approved') {
    if (!reason || !String(reason).trim()) throw new ApiError(httpStatus.BAD_REQUEST, 'cancellationReason is required');
    await restoreBalance(leaveRequest);
    leaveRequest.cancelledBy = changedBy;
    leaveRequest.cancelledAt = new Date();
    leaveRequest.cancellationReason = reason;
  } else if (leaveRequest.status !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, `Cannot change leave status from ${leaveRequest.status}`);
  }
  if (status === 'approved') {
    if (await hasOverlap(leaveRequest.toObject(), leaveRequest._id)) throw new ApiError(httpStatus.CONFLICT, 'Leave request overlaps an existing pending or approved leave');
    const leaveDays = await calculateLeaveDays(leaveRequest.employeeId, leaveRequest.singleDate || leaveRequest.startDate, leaveRequest.singleDate || leaveRequest.endDate || leaveRequest.startDate, leaveRequest.leaveDuration);
    leaveRequest.balanceUsage = await consumeBalance(leaveRequest, leaveDays);
    leaveRequest.balanceUsageRecorded = true;
    leaveRequest.leaveDays = leaveDays;
    leaveRequest.approvedBy = changedBy;
    leaveRequest.approvedAt = new Date();
  } else if (status === 'rejected') {
    leaveRequest.rejectedBy = changedBy;
    leaveRequest.rejectedAt = new Date();
    leaveRequest.rejectionReason = reason;
  } else if (status === 'cancelled' && leaveRequest.status !== 'approved') {
    leaveRequest.cancelledBy = changedBy;
    leaveRequest.cancelledAt = new Date();
    leaveRequest.cancellationReason = reason;
  }
  leaveRequest.status = status;
  leaveRequest.statusHistory.push({ status, changedBy, changedAt: new Date(), reason });
  await leaveRequest.save();
  return leaveRequest;
};

/**
 * Delete leave request by id
 * @param {ObjectId} id
 * @returns {Promise<LeaveRequests>}
 */
const deleteLeaveRequestsById = async (id) => {
  const leaveRequest = await getLeaveRequestsById(id);
  if (!leaveRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Leave request not found');
  }
  await leaveRequest.deleteOne();
  return leaveRequest;
};

module.exports = {
  createLeaveRequests,
  queryLeaveRequests,
  getLeaveRequestsById,
  getLeaveRequestsByEmployee,
  updateLeaveRequestsById,
  updateLeaveStatus,
  deleteLeaveRequestsById,
  calculateLeaveDays,
};
