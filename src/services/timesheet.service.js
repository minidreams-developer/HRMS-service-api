const mongoose = require('mongoose');
const { User, Attendance, LeaveRequests, Holiday, DayOff, Overtime } = require('../models');
const { getEmployeeShiftForDate } = require('./shiftAssignment.service');
const { getEffectiveShiftForDate } = require('./roster.service');
const { detectOverlappingOvertime } = require('./overtimeOverlap.service');
const ApiError = require('../utils/ApiError');
const { parseList, parseSort } = require('../utils/queryFilters');

const DAY = 86400000;
const day = (value) => { const d = new Date(value); if (Number.isNaN(d.getTime())) throw new ApiError(400, 'Invalid date'); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); };
const key = (value) => day(value).toISOString().slice(0, 10);
const end = (value) => new Date(day(value).getTime() + DAY - 1);
const days = (from, count) => Array.from({ length: count }, (_, i) => new Date(day(from).getTime() + (i * DAY)));
const addDays = (from, count) => new Date(day(from).getTime() + (count * DAY));
const id = (value) => value == null ? null : String(value);
const oid = (value) => mongoose.Types.ObjectId.isValid(String(value)) ? new mongoose.Types.ObjectId(String(value)) : null;

const departmentInfo = (user) => {
  const d = user.workInformation?.department;
  if (!d) return null;
  if (typeof d === 'object') return { id: id(d._id || d.id), name: d.name || d.departmentName || d.title };
  return { id: id(d) };
};
const userView = (user) => ({
  employeeId: user._id,
  employeeCode: user.employeeId,
  name: user.name,
  designation: user.workInformation?.designation,
  department: departmentInfo(user),
});
const shiftView = (shift) => shift ? { id: shift._id, name: shift.shiftName, code: shift.shiftCode } : null;
const matchesDepartment = (user, departmentId) => !departmentId || id(user.workInformation?.department?._id || user.workInformation?.department?.id || user.workInformation?.department) === String(departmentId);

const getUsers = async (options) => {
  const filter = { role: options.role, isDeleted: { $ne: true } };
  if (options.search) {
    const regex = new RegExp(options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { employeeId: regex }];
  }
  const users = await User.find(filter).select('name employeeId role workInformation').lean();
  const departmentIds = parseList(options.departmentIds || options.departmentId);
  const designationIds = parseList(options.designationIds);
  const shiftIds = parseList(options.shiftIds || options.shiftId);
  return users.filter((user) => {
    const department = id(user.workInformation?.department?._id || user.workInformation?.department?.id || user.workInformation?.department);
    const designation = id(user.workInformation?.designationId || user.workInformation?.designation);
    const shift = id(user.workInformation?.shiftId?._id || user.workInformation?.shiftId);
    return (!departmentIds.length || departmentIds.includes(department))
      && (!options.designation || String(user.workInformation?.designation || '').toLowerCase() === String(options.designation).toLowerCase())
      && (!designationIds.length || designationIds.includes(designation))
      && (!shiftIds.length || shiftIds.includes(shift));
  });
};

const loadSources = async (users, from, to) => {
  const ids = users.map((u) => u._id);
  // Attendance has legacy records where employeeId was saved as a string
  // instead of an ObjectId. Query and normalize both representations.
  const employeeCodes = users.map((u) => u.employeeId).filter(Boolean);
  const stringUserIds = users.map((u) => String(u._id));
  const attendanceEmployeeIds = [...ids, ...stringUserIds, ...employeeCodes];
  const range = { $gte: day(from), $lte: end(to) };
  const [attendance, leaves, holidays, dayOffs, overtime] = await Promise.all([
    Attendance.find({ employeeId: { $in: attendanceEmployeeIds }, $or: [{ attendanceDay: range }, { attendanceDay: { $exists: false }, date: range }] }).lean(),
    LeaveRequests.find({ employeeId: { $in: ids }, status: 'approved', $or: [{ singleDate: range }, { startDate: { $lte: end(to) }, endDate: { $gte: day(from) } }] }).lean(),
    Holiday.find({ status: true, date: range }).lean(),
    DayOff.find({ employeeId: { $in: ids }, status: true, date: range }).lean(),
    Overtime.find({ employeeId: { $in: ids }, status: 'approved', OvertimeDate: range }).lean(),
  ]);
  const userIdByAttendanceId = new Map();
  users.forEach((user) => {
    userIdByAttendanceId.set(String(user._id), String(user._id));
    if (user.employeeId) userIdByAttendanceId.set(String(user.employeeId), String(user._id));
  });
  const by = (records, field, normalize = false) => records.reduce((map, record) => {
    const rawKey = id(record[field]);
    const k = normalize ? (userIdByAttendanceId.get(rawKey) || rawKey) : rawKey;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(record);
    return map;
  }, new Map());
  return { attendance: by(attendance, 'employeeId', true), leaves: by(leaves, 'employeeId'), dayOffs: by(dayOffs, 'employeeId'), overtime: by(overtime, 'employeeId'), holidays };
};

const holidayFor = (holidays, employeeId, date) => holidays.find((h) => key(h.date) === key(date) && (!h.people || h.people.length === 0 || h.people.some((p) => id(p) === id(employeeId))));
const leaveFor = (records, date) => records.find((r) => {
  const d = day(date); const start = r.singleDate || r.startDate; const finish = r.singleDate || r.endDate || r.startDate;
  return start && d >= day(start) && d <= day(finish);
});
const attendanceFor = (records, date) => records.filter((r) => key(r.attendanceDay || r.date) === key(date)).sort((a, b) => String(a._id).localeCompare(String(b._id)))[0];
const overtimeFor = (records, date) => {
  const same = records.filter((r) => key(r.OvertimeDate) === key(date));
  const diagnostics = detectOverlappingOvertime(same);
  return same.filter((r) => !diagnostics.overlappingIds.has(String(r._id))).reduce((sum, r) => sum + (Number(r.totalDuration) || 0), 0);
};

const stateFor = async (user, date, sources) => {
  const employeeId = user._id;
  const attendance = attendanceFor(sources.attendance.get(id(employeeId)) || [], date);
  const holiday = holidayFor(sources.holidays, employeeId, date);
  const dayOff = (sources.dayOffs.get(id(employeeId)) || []).find((r) => key(r.date) === key(date));
  const leave = leaveFor(sources.leaves.get(id(employeeId)) || [], date);
  const shift = attendance?.shiftSnapshot || await getEffectiveShiftForDate(employeeId, date);
  const shiftData = attendance?.shiftSnapshot ? { _id: attendance.shiftSnapshot.shiftId, shiftId: attendance.shiftSnapshot.shiftId, shiftName: attendance.shiftSnapshot.shiftName, shiftCode: attendance.shiftSnapshot.shiftCode, weekOff: attendance.shiftSnapshot.weekOff || [] } : shift;
  let effectiveCategory = 'noAttendance'; let sourceType = 'none'; let sourceId = null;
  if (holiday) { effectiveCategory = 'holiday'; sourceType = 'holiday'; sourceId = holiday._id; }
  else if (dayOff) { effectiveCategory = 'dayOff'; sourceType = 'dayOff'; sourceId = dayOff._id; }
  // A recorded Attendance entry is authoritative for the day. Do not hide
  // actual check-in/check-out data behind a configured week-off.
  else if (!attendance && shiftData?.weekOff?.some((w) => String(w).toLowerCase() === date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toLowerCase())) effectiveCategory = 'weekOff';
  else if (leave) { effectiveCategory = 'leave'; sourceType = 'leave'; sourceId = leave._id; }
  else if (attendance) { effectiveCategory = attendance.attendanceCategory || 'noAttendance'; sourceType = 'attendance'; sourceId = attendance._id; }
  return { user, date: key(date), attendance, holiday, dayOff, leave, shift: shiftData, effectiveCategory, sourceType, sourceId, overtimeHours: overtimeFor(sources.overtime.get(id(employeeId)) || [], date) };
};

const regularWorkingHours = (state) => Math.max(0, (state.attendance?.totalWorkedHours || 0) - (state.overtimeHours || 0));
const present = (state) => ({ ...userView(state.user), shift: shiftView(state.shift), checkIn: state.attendance?.loginTime || null, checkOut: state.attendance?.logoutTime || null, workingHours: regularWorkingHours(state), attendanceCategory: state.attendance?.attendanceCategory || null, timingStatus: state.attendance?.timingStatus || state.attendance?.attendanceStatus || null, effectiveCategory: state.effectiveCategory, sourceType: state.sourceType, sourceId: state.sourceId, overtimeHours: state.overtimeHours });

const statesFor = async (users, dateList) => {
  const sources = await loadSources(users, dateList[0], dateList[dateList.length - 1]);
  const result = [];
  for (const user of users) for (const date of dateList) result.push(await stateFor(user, date, sources));
  return result;
};
const filterStatus = (state, status) => !status || state.effectiveCategory === status || state.attendance?.timingStatus === status || state.attendance?.attendanceStatus === status;
const pagination = (items, page, limit) => ({ results: items.slice((page - 1) * limit, page * limit), page, limit, totalResults: items.length, totalPages: Math.ceil(items.length / limit) });

const getStats = async (date = new Date(), role) => {
  const users = await getUsers({ role }); const states = await statesFor(users, [day(date)]); const unique = (predicate) => new Set(states.filter(predicate).map((s) => id(s.user._id))).size;
  return { date: key(date), role, present: unique((s) => s.attendance && s.attendance.loginTime && s.attendance.attendanceCategory !== 'absent'), absent: unique((s) => s.attendance?.attendanceCategory === 'absent'), onTime: unique((s) => (s.attendance?.timingStatus || s.attendance?.attendanceStatus) === 'onTime'), lateEntry: unique((s) => (s.attendance?.timingStatus || s.attendance?.attendanceStatus) === 'arrivedLate'), onLeave: unique((s) => s.leave) };
};

const getQuickStats = async (options) => {
  const reference = day(options.toDate || new Date());
  let from;
  const to = reference;
  if (options.fromDate) from = day(options.fromDate);
  else if (options.period === 'today') from = reference;
  else if (options.period === 'week') from = addDays(reference, 1 - (reference.getUTCDay() || 7));
  else if (options.period === 'month') from = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
  else from = addDays(reference, -29);
  if (from > to) throw new ApiError(400, 'fromDate must be before or equal to toDate');

  const users = await getUsers(options);
  const states = await statesFor(users, days(from, Math.floor((to - from) / DAY) + 1));
  const counted = states.filter((state) => state.attendance || state.leave);
  const unique = (predicate) => new Set(counted.filter(predicate).map((state) => `${id(state.user._id)}:${state.date}`)).size;
  return {
    period: options.period || (options.fromDate ? 'custom' : 'last30days'),
    role: options.role,
    fromDate: key(from),
    toDate: key(to),
    present: unique((state) => ['fullDay', 'halfDay'].includes(state.attendance?.attendanceCategory)),
    absent: unique((state) => state.attendance?.attendanceCategory === 'absent'),
    onTime: unique((state) => (state.attendance?.timingStatus || state.attendance?.attendanceStatus) === 'onTime'),
    lateEntry: unique((state) => (state.attendance?.timingStatus || state.attendance?.attendanceStatus) === 'arrivedLate'),
    onLeave: unique((state) => Boolean(state.leave)),
  };
};

const getDay = async (options) => {
  const users = await getUsers(options); const states = (await statesFor(users, [day(options.date)])).filter((s) => filterStatus(s, options.status));
  const shiftIds = parseList(options.shiftIds || options.shiftId);
  const shiftFiltered = shiftIds.length ? states.filter((s) => shiftIds.includes(id(s.shift?._id || s.shift?.shiftId))) : states;
  const sort = parseSort(options.sortBy, ['date', 'name', 'status'], { date: -1 });
  if (sort.name) shiftFiltered.sort((a, b) => (a.user.name || '').localeCompare(b.user.name || '') * sort.name);
  if (sort.date) shiftFiltered.sort((a, b) => (a.date < b.date ? -1 : 1) * sort.date);
  const page = Number(options.page) || 1; const limit = Number(options.limit) || 10;
  return { date: key(options.date), role: options.role, ...pagination(shiftFiltered.map(present), page, limit) };
};

const getWeek = async (options) => {
  const users = await getUsers(options); const dateList = days(options.startDate, 7); const states = await statesFor(users, dateList); const grouped = new Map();
  states.forEach((s) => { if (!grouped.has(id(s.user._id))) grouped.set(id(s.user._id), { ...userView(s.user), days: [] }); grouped.get(id(s.user._id)).days.push(present(s)); });
  let results = [...grouped.values()]; const shiftIds = parseList(options.shiftIds || options.shiftId); if (shiftIds.length) results = results.filter((r) => r.days.some((d) => shiftIds.includes(id(d.shift?.id))));
  const sort = parseSort(options.sortBy, ['name', 'status'], { name: 1 });
  if (sort.name) results.sort((a, b) => (a.name || '').localeCompare(b.name || '') * sort.name);
  const page = Number(options.page) || 1; const limit = Number(options.limit) || 10;
  return { startDate: key(options.startDate), endDate: key(dateList[6]), role: options.role, ...pagination(results, page, limit) };
};

const getDateDetail = async (employeeId, date) => {
  const user = await User.findOne({ _id: employeeId, isDeleted: { $ne: true } }).select('name employeeId role workInformation').lean();
  if (!user) throw new ApiError(404, 'Employee not found');
  const state = (await statesFor([user], [day(date)]))[0]; const base = { employee: userView(user), date: state.date, effectiveCategory: state.effectiveCategory, sourceType: state.sourceType, sourceId: state.sourceId };
  if (state.sourceType === 'attendance') return { ...base, details: { loginTime: state.attendance.loginTime, logoutTime: state.attendance.logoutTime, workingHours: regularWorkingHours(state), breakHours: state.attendance.shiftSnapshot?.breakDuration ? state.attendance.shiftSnapshot.breakDuration / 60 : 0, shift: shiftView(state.shift), timingStatus: state.attendance.timingStatus || state.attendance.attendanceStatus, attendanceCategory: state.attendance.attendanceCategory, remarks: state.attendance.remarks, overtimeHours: state.overtimeHours, attendanceLogs: [], attendanceLogSupported: false } };
  if (state.sourceType === 'leave') return { ...base, details: { leaveType: state.leave.leaveType, leaveDuration: state.leave.leaveDuration, halfDaySession: state.leave.halfDaySession, date: state.date, status: state.leave.status } };
  if (state.sourceType === 'holiday') return { ...base, details: { holidayTitle: state.holiday.holidayTitle, description: state.holiday.description, date: state.holiday.date, nextWorkingDay: state.holiday.nextWorkingDay, Remarks: state.holiday.Remarks } };
  if (state.sourceType === 'dayOff') return { ...base, details: { date: state.date, reason: state.dayOff.reason, status: state.dayOff.status } };
  if (state.sourceType === 'weekOff') return { ...base, details: { date: state.date, shift: shiftView(state.shift), weekday: new Date(date).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }) } };
  return { ...base, effectiveCategory: 'noAttendance', details: { date: state.date, shift: shiftView(state.shift) } };
};

module.exports = { getStats, getQuickStats, getDay, getWeek, getDateDetail };
