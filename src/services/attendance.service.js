const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { Attendance, Holiday, DayOff, LeaveRequests, Overtime, User, Shift } = require('../models');
const { getApplicableHolidays } = require('./holiday.service');
const { getEmployeeShiftForDate } = require('./shiftAssignment.service');
const { getEffectiveShiftForDate } = require('./roster.service');
const { detectOverlappingOvertime } = require('./overtimeOverlap.service');
const ApiError = require('../utils/ApiError');

const utcDay = (value) => {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const parseWorkingHours = (value) => {
  if (typeof value !== 'string' || !/^\d+(?:\.\d+)?h$/.test(value.trim())) return null;
  const hours = Number.parseFloat(value);
  return Number.isFinite(hours) && hours > 0 ? hours : null;
};

const getShiftForAttendance = async (shiftId) => {
  if (!shiftId || !isObjectId(shiftId)) return null;
  return mongoose.model('Shift').findById(shiftId).lean();
};

const syncAttendanceOvertime = async (attendance, actorId) => {
  const snapshotThreshold = Number(attendance.shiftSnapshot?.overtimeAfterHours);
  let threshold = Number.isFinite(snapshotThreshold) && snapshotThreshold > 0 ? snapshotThreshold : null;
  if (!threshold && attendance.shiftId) {
    const shift = await getShiftForAttendance(attendance.shiftId);
    const resolvedThreshold = Number(shift?.overtimeAfterHours);
    if (Number.isFinite(resolvedThreshold) && resolvedThreshold > 0) threshold = resolvedThreshold;
  }

  const linked = await Overtime.find({ attendanceId: attendance._id, source: 'attendance' }).sort({ createdAt: -1 });
  const excess = threshold && Number(attendance.totalWorkedHours) > threshold
    ? Number((Number(attendance.totalWorkedHours) - threshold).toFixed(4))
    : 0;
  const pending = linked.find((record) => record.status === 'pending');
  const approved = linked.find((record) => record.status === 'approved');

  if (!excess || !attendance.loginTime || !attendance.logoutTime) {
    if (pending) {
      pending.status = 'cancelled';
      pending.cancelledBy = actorId;
      pending.cancelledAt = new Date();
      pending.cancellationReason = 'Attendance no longer exceeds the overtime threshold';
      pending.statusHistory.push({ status: 'cancelled', changedBy: actorId, changedAt: new Date(), reason: pending.cancellationReason });
      await pending.save();
    }
    return approved || linked[0] || null;
  }

  // An approved request is payroll history and must never be rewritten by an attendance edit.
  if (approved) return approved;
  // A rejected request remains history; do not reopen it or create retry duplicates.
  if (linked.some((record) => record.status === 'rejected')) return linked.find((record) => record.status === 'rejected');

  const end = new Date(attendance.logoutTime);
  const start = new Date(end.getTime() - excess * 3600000);
  const payload = {
    employeeId: attendance.employeeId,
    requestedDate: attendance.attendanceDay || utcDay(attendance.date),
    OvertimeDate: attendance.attendanceDay || utcDay(attendance.date),
    startTime: start,
    endTime: end,
    totalDuration: excess,
    status: 'pending',
    source: 'attendance',
    attendanceId: attendance._id,
    generatedBySystem: true,
    reason: 'Automatic overtime from attendance excess',
    createdBy: actorId,
  };
  if (pending) {
    Object.assign(pending, payload);
    await pending.save();
    return pending;
  }
  try {
    return await Overtime.create({ ...payload, statusHistory: [{ status: 'pending', changedBy: actorId, changedAt: new Date(), reason: payload.reason }] });
  } catch (error) {
    if (error.code === 11000) return Overtime.findOne({ attendanceId: attendance._id, source: 'attendance', status: { $in: ['pending', 'approved'] } });
    throw error;
  }
};

const deriveAttendance = async (body, existing = null, options = {}) => {
  const record = { ...(existing || {}), ...body };
  if (!record.shiftId && record.employeeId && record.date) {
    const resolved = await getEffectiveShiftForDate(record.employeeId, record.date);
    if (resolved) record.shiftId = resolved._id;
  }
  const explicitlyAbsent = body.attendanceCategory === 'absent' && !record.loginTime && !record.logoutTime;
  if (explicitlyAbsent) {
    record.totalWorkedHours = 0;
    record.attendanceCategory = 'absent';
    if (options.allowManualOverride && body.attendanceCategory) record.isManualOverride = true;
    return record;
  }

  if ((record.loginTime && !record.logoutTime) || (!record.loginTime && record.logoutTime)) {
    return record;
  }
  if (!record.loginTime || !record.logoutTime) return record;

  const login = new Date(record.loginTime);
  const logout = new Date(record.logoutTime);
  const grossHours = (logout - login) / (1000 * 60 * 60);
  if (!Number.isFinite(grossHours) || grossHours < 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'logoutTime must be after loginTime');
  }

  const shift = await getShiftForAttendance(record.shiftId);
  const snapshotMatchesShift = existing?.shiftSnapshot?.shiftId
    && (!record.shiftId || String(existing.shiftSnapshot.shiftId) === String(record.shiftId));
  const shiftConfig = snapshotMatchesShift ? existing.shiftSnapshot : shift;
  const fullDayThreshold = parseWorkingHours(shiftConfig?.minWorkingHours);
  const halfDayThreshold = parseWorkingHours(shiftConfig?.halfDayWorkingHours);
  if (!shift || !fullDayThreshold || !halfDayThreshold) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Shift must have valid minWorkingHours and halfDayWorkingHours');
  }
  if (halfDayThreshold > fullDayThreshold) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'halfDayWorkingHours must be less than or equal to minWorkingHours');
  }

  const breakMinutes = shiftConfig?.breakEnabled === true
    ? (shiftConfig.breakDuration || 0)
    : (shift?.breakManagement?.enabled === true ? (shift.breakManagement.duration || 0) : 0);
  if (shift && record.shiftId && (!record.shiftSnapshot || !snapshotMatchesShift)) {
    record.shiftSnapshot = { shiftId: shift._id, shiftName: shift.shiftName, shiftCode: shift.shiftCode, minWorkingHours: shift.minWorkingHours, halfDayWorkingHours: shift.halfDayWorkingHours, overtimeAfterHours: shift.overtimeAfterHours, breakEnabled: shift.breakManagement?.enabled === true, breakDuration: breakMinutes, weekOff: shift.weekOff || [], timings: shift.timings || [] };
  }
  const totalWorkedHours = Math.max(0, grossHours - (breakMinutes / 60));
  record.totalWorkedHours = Number(totalWorkedHours.toFixed(4));
  record.attendanceCategory = totalWorkedHours >= fullDayThreshold
    ? 'fullDay'
    : totalWorkedHours >= halfDayThreshold ? 'halfDay' : 'absent';
  if (options.allowManualOverride && body.attendanceCategory) {
    record.attendanceCategory = body.attendanceCategory;
    record.isManualOverride = true;
    record.overrideReason = options.editReason;
  }
  if (!record.timingStatus && record.attendanceStatus) record.timingStatus = record.attendanceStatus;
  return record;
};

const isObjectId = (val) =>
  mongoose.Types.ObjectId.isValid(val) && String(new mongoose.Types.ObjectId(val)) === String(val);

/**
 * Populate employeeId and shiftId on attendance docs where values are valid ObjectIds
 */
const populateAttendance = async (docs) => {
  const arr = Array.isArray(docs) ? docs : [docs];
  for (const doc of arr) {
    if (doc.employeeId && isObjectId(doc.employeeId)) {
      await mongoose.model('User').populate(doc, { path: 'employeeId', select: 'name employeeId email phone workInformation.designation' });
    }
    if (doc.shiftId && isObjectId(doc.shiftId)) {
      await mongoose.model('Shift').populate(doc, { path: 'shiftId', select: 'shiftName shiftCode shiftType timings' });
    }
  }
};

const validateAttendanceDay = async (employeeId, attendanceDay) => {
  const day = utcDay(attendanceDay);
  const nextDay = new Date(day.getTime() + 86400000);
  const employeeObjectId = isObjectId(employeeId) ? new mongoose.Types.ObjectId(employeeId) : employeeId;

  const holiday = await Holiday.findOne({
    status: true,
    date: { $gte: day, $lt: nextDay },
    $or: [
      { people: { $size: 0 } },
      { people: { $exists: false } },
      { people: employeeObjectId },
    ],
  }).lean();
  if (holiday) throw new ApiError(httpStatus.BAD_REQUEST, 'Attendance cannot be created on a holiday');

  const leave = await LeaveRequests.findOne({
    employeeId: employeeObjectId,
    status: 'approved',
    $or: [
      { singleDate: { $gte: day, $lt: nextDay } },
      { startDate: { $lte: day }, endDate: { $gte: day } },
    ],
  }).lean();
  if (leave) throw new ApiError(httpStatus.BAD_REQUEST, 'Attendance cannot be created during approved leave');

  const dayOff = await DayOff.findOne({ employeeId: employeeObjectId, status: true, date: { $gte: day, $lt: nextDay } }).lean();
  if (dayOff) throw new ApiError(httpStatus.BAD_REQUEST, 'Attendance cannot be created on a day off');
};

/**
 * Create an attendance record
 */
const createAttendance = async (body, actorId) => {
  const employee = await User.findById(body.employeeId).lean();
  if (!employee || employee.isDeleted === true) throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  if (employee.isActive !== 'Active') throw new ApiError(httpStatus.BAD_REQUEST, 'Relieved employee cannot create Attendance');
  if (body.shiftId) {
    const explicitShift = await Shift.findById(body.shiftId).lean();
    if (!explicitShift) throw new ApiError(httpStatus.NOT_FOUND, 'Shift not found');
    if (explicitShift.isShiftActive === false) throw new ApiError(httpStatus.BAD_REQUEST, 'Inactive Shift cannot be selected for new Attendance');
  }
  const attendance = await deriveAttendance(body);
  attendance.attendanceDay = utcDay(attendance.date);
  await validateAttendanceDay(attendance.employeeId, attendance.attendanceDay);
  attendance.createdBy = actorId;
  attendance.creationSource = 'manual';
  attendance.createdReason = body.createdReason;
  const duplicate = await Attendance.findOne({
    employeeId: attendance.employeeId,
    date: { $gte: attendance.attendanceDay, $lt: new Date(attendance.attendanceDay.getTime() + 86400000) },
  }).lean();
  if (duplicate) throw new ApiError(httpStatus.CONFLICT, 'Attendance already exists for this employee on this date');
  if (!attendance.timingStatus && attendance.attendanceStatus) attendance.timingStatus = attendance.attendanceStatus;
  try {
    const saved = await Attendance.create(attendance);
    await syncAttendanceOvertime(saved, actorId);
    return saved;
  } catch (error) {
    if (error.code === 11000) throw new ApiError(httpStatus.CONFLICT, 'Attendance already exists for this employee on this date');
    throw error;
  }
};

/**
 * Query for attendances with search and filter support.
 *
 * Filter keys:
 *   search           — regex across linked user's name, email, employeeId
 *   employeeId       — exact ObjectId match
 *   shiftId          — exact ObjectId match
 *   attendanceStatus — 'onTime' | 'earlyOut' | 'arrivedLate'
 *   date             — exact date match
 *   fromDate         — attendance date >= fromDate
 *   toDate           — attendance date <= toDate
 */
const queryAttendances = async (filter, options) => {
  const { User, Department, Shift } = require('../models');
  const mongoFilter = {};

  const intersectEmployeeIds = async (ids) => {
    const current = mongoFilter.employeeId?.$in;
    const allowed = new Set(ids.map(String));
    if (current) mongoFilter.employeeId.$in = current.filter((item) => allowed.has(String(item)));
    else mongoFilter.employeeId = { $in: ids };
  };

  // Search — resolve user IDs first, then scope attendance records
  if (filter.search) {
    const regex = { $regex: filter.search, $options: 'i' };
    const matchedUsers = await User.find(
      { $or: [{ name: regex }, { email: regex }, { employeeId: regex }] },
      { _id: 1 }
    ).lean();
    const userIds = matchedUsers.map((u) => u._id);
    await intersectEmployeeIds(userIds);
  }

  // Role belongs to User, so resolve matching users before querying Attendance.
  if (filter.role) {
    const roleUsers = await User.find({ role: filter.role }, { _id: 1 }).lean();
    await intersectEmployeeIds(roleUsers.map((user) => user._id));
  }

  if (filter.departmentId || filter.department) {
    let departmentIds = [];
    if (filter.departmentId) departmentIds.push(new mongoose.Types.ObjectId(filter.departmentId));
    if (filter.department) {
      const departmentRegex = new RegExp(`^${String(filter.department).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}$`, 'i');
      departmentIds = departmentIds.concat(await Department.find({ departmentName: departmentRegex }, { _id: 1 }).lean().then((rows) => rows.map((row) => row._id)));
    }
    const departmentUsers = await User.find({ 'workInformation.department': { $in: departmentIds } }, { _id: 1 }).lean();
    await intersectEmployeeIds(departmentUsers.map((user) => user._id));
  }

  // Direct employeeId filter (overrides search scope if both given)
  if (filter.employeeId && isObjectId(filter.employeeId)) {
    await intersectEmployeeIds([new mongoose.Types.ObjectId(filter.employeeId)]);
  }

  // Shift filter. Attendance.shiftId/shiftSnapshot are historical sources;
  // do not use the employee's current shift for this attendance list.
  if (filter.shiftId || filter.shift) {
    let shiftIds = [];
    if (filter.shiftId) shiftIds.push(new mongoose.Types.ObjectId(filter.shiftId));
    if (filter.shift) {
      const shiftRegex = new RegExp(`^${String(filter.shift).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}$`, 'i');
      shiftIds = shiftIds.concat(await Shift.find({ shiftName: shiftRegex }, { _id: 1 }).lean().then((rows) => rows.map((row) => row._id)));
    }
    const matchingAttendance = await Attendance.find({ $or: [{ shiftId: { $in: shiftIds } }, { 'shiftSnapshot.shiftId': { $in: shiftIds } }] }, { employeeId: 1 }).lean();
    await intersectEmployeeIds(matchingAttendance.map((record) => record.employeeId));
    mongoFilter.$and = (mongoFilter.$and || []).concat({ $or: [{ shiftId: { $in: shiftIds } }, { 'shiftSnapshot.shiftId': { $in: shiftIds } }] });
  }

  // Attendance status filter
  if (filter.attendanceStatus) {
    mongoFilter.attendanceStatus = filter.attendanceStatus;
  }
  if (filter.timingStatus) mongoFilter.$or = [{ timingStatus: filter.timingStatus }, { attendanceStatus: filter.timingStatus }];
  if (filter.attendanceCategory) mongoFilter.attendanceCategory = filter.attendanceCategory;

  // Exact date filter
  if (filter.date && !filter.fromDate && !filter.toDate) {
    const d = new Date(filter.date);
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
    const end   = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
    mongoFilter.date = { $gte: start, $lte: end };
  }

  // Date range filter
  if (filter.fromDate || filter.toDate) {
    mongoFilter.date = {};
    if (filter.fromDate) mongoFilter.date.$gte = new Date(filter.fromDate);
    if (filter.toDate) {
      const end = new Date(filter.toDate);
      end.setUTCHours(23, 59, 59, 999);
      mongoFilter.date.$lte = end;
    }
  }

  const result = await Attendance.paginate(mongoFilter, options);
  await populateAttendance(result.results);
  return result;
};

/**
 * Get attendance by id
 */
const getAttendanceById = async (id) => {
  const attendance = await Attendance.findById(id);
  if (attendance) await populateAttendance(attendance);
  return attendance;
};

/**
 * Update attendance by id
 */
const updateAttendanceById = async (id, updateBody, editor) => {
  const attendance = await Attendance.findById(id);
  if (!attendance) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Attendance not found');
  }
  const editable = {};
  ['date', 'shiftId', 'loginTime', 'logoutTime', 'attendanceCategory', 'remarks'].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(updateBody, field)) editable[field] = updateBody[field];
  });
  const updated = await deriveAttendance(editable, attendance.toObject(), {
    allowManualOverride: Boolean(updateBody.attendanceCategory),
    editReason: updateBody.editReason,
  });
  if (Object.prototype.hasOwnProperty.call(editable, 'date')) {
    updated.attendanceDay = utcDay(editable.date);
    await validateAttendanceDay(attendance.employeeId, updated.attendanceDay);
    const duplicate = await Attendance.findOne({
      employeeId: attendance.employeeId,
      date: { $gte: updated.attendanceDay, $lt: new Date(updated.attendanceDay.getTime() + 86400000) },
      _id: { $ne: attendance._id },
    }).lean();
    if (duplicate) throw new ApiError(httpStatus.CONFLICT, 'Attendance already exists for this employee on this date');
  } else if (!attendance.attendanceDay && attendance.date) {
    updated.attendanceDay = utcDay(attendance.date);
  }
  updated.lastEditedBy = editor;
  updated.lastEditedAt = new Date();
  updated.editReason = updateBody.editReason;
  Object.assign(attendance, updated);
  if (updated.timingStatus) attendance.attendanceStatus = updated.timingStatus;
  try {
    await attendance.save();
  } catch (error) {
    if (error.code === 11000) throw new ApiError(httpStatus.CONFLICT, 'Attendance already exists for this employee on this date');
    throw error;
  }
  await syncAttendanceOvertime(attendance, editor);
  await populateAttendance(attendance);
  return attendance;
};

/**
 * Delete attendance by id
 */
const deleteAttendanceById = async (id) => {
  const attendance = await Attendance.findById(id);
  if (!attendance) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Attendance not found');
  }
  await attendance.deleteOne();
  return attendance;
};

const dayKey = (value) => utcDay(value).toISOString().slice(0, 10);

const enumerateDays = (fromDate, toDate) => {
  const days = [];
  for (let date = utcDay(fromDate); date <= utcDay(toDate); date = new Date(date.getTime() + 86400000)) {
    days.push(new Date(date));
  }
  return days;
};

const rangeEnd = (value) => new Date(utcDay(value).getTime() + 86399999);

const duplicateDateInfo = (records) => {
  const counts = new Map();
  for (const record of records) {
    const key = dayKey(record.date);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([date, count]) => ({ date, count }));
};

/**
 * Employee attendance summary.
 *
 * Summary-only precedence for mutually exclusive calendar categories:
 * Holiday > Day Off > Approved Leave > Attendance.
 * Total working days excludes holidays and days off; approved leave remains
 * in the denominator because the current product rules do not exclude it.
 */
const getEmployeeAttendanceSummary = async (employeeId, fromDate, toDate) => {
  const from = utcDay(fromDate);
  const to = utcDay(toDate);
  if (from > to) throw new ApiError(httpStatus.BAD_REQUEST, 'fromDate must be before or equal to toDate');

  const employeeObjectId = isObjectId(employeeId) ? new mongoose.Types.ObjectId(employeeId) : employeeId;
  const employee = await User.findById(employeeObjectId).lean();
  if (!employee) throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');

  const [attendanceRecords, leaveRecords, holidayRecords, dayOffRecords, overtimeRecords] = await Promise.all([
    Attendance.find({ employeeId: employeeObjectId, date: { $gte: from, $lte: rangeEnd(to) } }).sort({ date: 1, createdAt: 1 }).lean(),
    LeaveRequests.find({
      employeeId: employeeObjectId,
      status: 'approved',
      $or: [
        { singleDate: { $gte: from, $lte: rangeEnd(to) } },
        { startDate: { $lte: rangeEnd(to) }, endDate: { $gte: from } },
      ],
    }).lean(),
    getApplicableHolidays(employeeObjectId, from, to),
    DayOff.find({ employeeId: employeeObjectId, status: true, date: { $gte: from, $lte: rangeEnd(to) } }).lean(),
    Overtime.find({
      employeeId: employeeObjectId,
      status: 'approved',
      OvertimeDate: { $gte: from, $lte: rangeEnd(to) },
    }).lean(),
  ]);

  const days = enumerateDays(from, to);
  const duplicateAttendanceDates = duplicateDateInfo(attendanceRecords);
  const holidayDays = new Set(holidayRecords.map((holiday) => dayKey(holiday.date)));
  const shiftId = employee.workInformation?.shiftId;
  const shift = shiftId && isObjectId(shiftId) ? await Shift.findById(shiftId).lean() : null;
  const weekOff = new Set((shift?.weekOff || []).map((day) => String(day).toLowerCase()));
  const assignedDayOffDays = new Set(dayOffRecords.map((record) => dayKey(record.date)));
  const shiftByDate = new Map();
  for (const date of days) shiftByDate.set(dayKey(date), await getEmployeeShiftForDate(employeeObjectId, date));
  const shiftWeekOffDays = new Set(days.filter((date) => {
    const shiftForDate = shiftByDate.get(dayKey(date));
    return (shiftForDate?.weekOff || []).map((value) => String(value).toLowerCase()).includes(date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toLowerCase());
  }).map(dayKey));
  const dayOffDays = new Set([...assignedDayOffDays, ...shiftWeekOffDays]);

  const leaveDays = new Set();
  for (const leave of leaveRecords) {
    const leaveStart = leave.singleDate || leave.startDate;
    const leaveEnd = leave.singleDate || leave.endDate || leave.startDate;
    if (!leaveStart) continue;
    for (const date of enumerateDays(Math.max(from.getTime(), utcDay(leaveStart).getTime()), Math.min(to.getTime(), utcDay(leaveEnd).getTime()))) {
      const key = dayKey(date);
      if (!holidayDays.has(key) && !dayOffDays.has(key)) leaveDays.add(key);
    }
  }

  const attendanceByDay = new Map();
  for (const record of attendanceRecords) {
    const key = dayKey(record.date);
    if (!duplicateAttendanceDates.some((item) => item.date === key)
      && !holidayDays.has(key) && !dayOffDays.has(key) && !leaveDays.has(key) && !attendanceByDay.has(key)) {
      attendanceByDay.set(key, record);
    }
  }

  const countCategory = (category) => [...attendanceByDay.values()].filter((record) => record.attendanceCategory === category).length;
  const overtimeDiagnostics = detectOverlappingOvertime(overtimeRecords);
  const safeOvertime = overtimeRecords.filter((record) => !overtimeDiagnostics.overlappingIds.has(String(record._id)));
  const overtimeDays = new Set(safeOvertime.map((record) => dayKey(record.OvertimeDate))).size;
  const overtimeHours = safeOvertime.reduce((sum, record) => sum + (record.totalDuration || 0), 0);
  const holidayCount = holidayDays.size;
  const dayOffCount = [...dayOffDays].filter((key) => !holidayDays.has(key)).length;

  return {
    employeeId,
    fromDate: from,
    toDate: to,
    totalWorkingDays: days.length - holidayCount - dayOffCount,
    fullDays: countCategory('fullDay'),
    halfDays: countCategory('halfDay'),
    absent: countCategory('absent'),
    overtime: overtimeHours,
    overtimeDays,
    overtimeHours,
    dayOff: dayOffCount,
    dayOffBreakdown: { assignedDayOff: [...assignedDayOffDays].filter((key) => !holidayDays.has(key)).length, shiftWeekOff: [...shiftWeekOffDays].filter((key) => !holidayDays.has(key)).length },
    holidays: holidayCount,
    leaves: leaveDays.size,
    duplicateAttendanceDates,
    overlappingOvertimeRecords: overtimeDiagnostics.groups,
    overlappingOvertimeDates: overtimeDiagnostics.overlappingDates,
  };
};

const attendanceListFields = 'employeeId date attendanceCategory timingStatus attendanceStatus loginTime logoutTime totalWorkedHours shiftId remarks isManualOverride overrideReason createdBy creationSource createdReason lastEditedBy lastEditedAt editReason';

const getEmployeeAttendance = async (employeeId, filter = {}, options = {}) => {
  const employeeObjectId = isObjectId(employeeId) ? new mongoose.Types.ObjectId(employeeId) : employeeId;
  const employee = await User.findById(employeeObjectId).lean();
  if (!employee) throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  const result = await queryAttendances({ ...filter, employeeId: employeeObjectId }, options);
  const records = result.results.map((record) => ({
    id: record.id || record._id,
    employeeId: record.employeeId?.id || record.employeeId,
    date: record.date,
    attendanceCategory: record.attendanceCategory,
    timingStatus: record.timingStatus || record.attendanceStatus,
    attendanceStatus: record.attendanceStatus,
    loginTime: record.loginTime,
    logoutTime: record.logoutTime,
    totalWorkedHours: record.totalWorkedHours,
    isManualOverride: record.isManualOverride,
    overrideReason: record.overrideReason,
    shift: record.shiftId || null,
    remarks: record.remarks,
  }));
  return { ...result, results: records };
};

const getEmployeeCalendar = async (employeeId, fromDate, toDate) => {
  const from = utcDay(fromDate); const to = utcDay(toDate);
  if (from > to) throw new ApiError(httpStatus.BAD_REQUEST, 'fromDate must be before or equal to toDate');
  const employeeObjectId = isObjectId(employeeId) ? new mongoose.Types.ObjectId(employeeId) : employeeId;
  const employee = await User.findById(employeeObjectId).lean();
  if (!employee) throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  const [attendance, leaves, holidays, dayOffRecords, overtime] = await Promise.all([
    Attendance.find({ employeeId: employeeObjectId, date: { $gte: from, $lte: rangeEnd(to) } }).select(attendanceListFields).sort({ date: 1, createdAt: 1 }).lean(),
    LeaveRequests.find({ employeeId: employeeObjectId, status: 'approved', $or: [{ singleDate: { $gte: from, $lte: rangeEnd(to) } }, { startDate: { $lte: rangeEnd(to) }, endDate: { $gte: from } }] }).lean(),
    getApplicableHolidays(employeeObjectId, from, to),
    DayOff.find({ employeeId: employeeObjectId, status: true, date: { $gte: from, $lte: rangeEnd(to) } }).lean(),
    Overtime.find({ employeeId: employeeObjectId, status: 'approved', OvertimeDate: { $gte: from, $lte: rangeEnd(to) } }).lean(),
  ]);
  const shiftByDate = new Map();
  for (const date of enumerateDays(from, to)) shiftByDate.set(dayKey(date), await getEmployeeShiftForDate(employeeObjectId, date));
  const assignedDayOffDays = new Set(dayOffRecords.map((record) => dayKey(record.date)));
  const byDate = new Map(attendance.map((record) => [dayKey(record.date), record]));
  const duplicateCounts = new Map(duplicateDateInfo(attendance).map((item) => [item.date, item.count]));
  const leaveDays = new Set();
  for (const leave of leaves) {
    const start = leave.singleDate || leave.startDate; const end = leave.singleDate || leave.endDate || leave.startDate;
    if (start) for (const date of enumerateDays(Math.max(from, utcDay(start)), Math.min(to, utcDay(end)))) leaveDays.add(dayKey(date));
  }
  const holidayDays = new Map(holidays.map((holiday) => [dayKey(holiday.date), holiday]));
  const overtimeDiagnostics = detectOverlappingOvertime(overtime);
  const overtimeByDay = new Map(overtime.filter((record) => !overtimeDiagnostics.overlappingIds.has(String(record._id))).map((record) => [dayKey(record.OvertimeDate), record]));
  return enumerateDays(from, to).map((date) => {
    const key = dayKey(date); const record = byDate.get(key);
    const holiday = holidayDays.get(key);
    const shift = shiftByDate.get(key);
    const weekOff = (shift?.weekOff || []).map((value) => String(value).toLowerCase()).includes(date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toLowerCase());
    const dayOff = assignedDayOffDays.has(key) || weekOff;
    const category = duplicateCounts.has(key) ? 'duplicate' : holiday ? 'holiday' : assignedDayOffDays.has(key) ? 'dayOff' : dayOff ? 'dayOff' : leaveDays.has(key) ? 'leave' : record?.attendanceCategory;
    const ot = overtimeByDay.get(key);
    return { date: key, category, dayOffType: category === 'dayOff' ? (assignedDayOffDays.has(key) ? 'assigned' : 'weekOff') : undefined, attendanceCategory: record?.attendanceCategory, timingStatus: record?.timingStatus || record?.attendanceStatus, totalWorkedHours: record?.totalWorkedHours || 0, approvedOvertime: ot ? { hours: ot.totalDuration || 0, id: ot.id || ot._id } : null, overtimeConflict: overtimeDiagnostics.overlappingDates.includes(key), attendanceId: record?.id || record?._id, duplicateAttendanceCount: duplicateCounts.get(key) || 0 };
  });
};

const getPresentEmployeesToday = async (date = new Date(), role = null, filters = {}) => {
  const start = utcDay(date); const end = new Date(start.getTime() + 86400000);
  const rows = await Attendance.find({ $or: [
    { attendanceDay: { $gte: start, $lt: end } },
    { attendanceDay: { $exists: false }, date: { $gte: start, $lt: end } },
  ], loginTime: { $ne: null }, attendanceCategory: { $ne: 'absent' } }).sort({ loginTime: 1 }).lean();
  const employeeIds = rows.map((row) => row.employeeId).filter(Boolean);
  const userQuery = { _id: { $in: employeeIds } };
  if (role) userQuery.role = role;
  if (filters.departmentId) {
    const departmentValue = mongoose.Types.ObjectId.isValid(String(filters.departmentId))
      ? [filters.departmentId, new mongoose.Types.ObjectId(filters.departmentId)]
      : [filters.departmentId];
    userQuery.$or = [
      { 'workInformation.department': { $in: departmentValue } },
      { 'workInformation.department._id': { $in: departmentValue } },
    ];
  }
  const users = await User.find(userQuery).select('name employeeId email role isActive workInformation.department workInformation.designation').lean();
  const usersById = new Map(users.map((user) => [String(user._id), user]));
  const shiftIds = rows.map((row) => {
    const value = row.shiftId || row.shiftSnapshot?.shiftId;
    return value && typeof value === 'object' ? value._id : value;
  }).filter((value) => value && mongoose.Types.ObjectId.isValid(String(value)));
  const shifts = await Shift.find({ _id: { $in: shiftIds } }).select('shiftName shiftCode shiftType timings weekOff minWorkingHours halfDayWorkingHours overtimeAfterHours').lean();
  const shiftsById = new Map(shifts.map((shift) => [String(shift._id), shift]));
  return rows.map((row) => ({ row, employee: usersById.get(String(row.employeeId)) }))
    .filter(({ row }) => {
      if (!filters.shiftId) return true;
      const value = row.shiftId || row.shiftSnapshot?.shiftId;
      const idValue = value && typeof value === 'object' ? value._id : value;
      return String(idValue) === String(filters.shiftId);
    })
    .filter(({ employee }) => employee && ['employee', 'staff'].includes(employee.role) && (!role || employee.role === role))
    .map(({ row, employee }) => ({
    attendanceId: row._id, employee, date: row.attendanceDay || row.date, loginTime: row.loginTime, logoutTime: row.logoutTime,
    attendanceCategory: row.attendanceCategory, timingStatus: row.timingStatus || row.attendanceStatus, totalWorkedHours: row.totalWorkedHours || 0,
    shift: shiftsById.get(String(row.shiftId || row.shiftSnapshot?.shiftId)) || row.shiftSnapshot || null,
  }));
};

module.exports = {
  createAttendance,
  queryAttendances,
  getAttendanceById,
  updateAttendanceById,
  deleteAttendanceById,
  getEmployeeAttendanceSummary,
  getEmployeeAttendance,
  getEmployeeCalendar,
  getPresentEmployeesToday,
};
