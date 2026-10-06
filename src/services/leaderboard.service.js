const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { Leaderboard, User, Attendance, LeaveRequests, Holiday, DayOff, Overtime } = require('../models');
const { getEmployeeShiftForDate } = require('./shiftAssignment.service');
const ApiError = require('../utils/ApiError');

const day = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid date');
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};
const key = (value) => day(value).toISOString().slice(0, 10);
const addDays = (value, count) => new Date(day(value).getTime() + count * 86400000);
const monday = (value) => {
  const date = day(value);
  const weekday = date.getUTCDay() || 7;
  return addDays(date, 1 - weekday);
};

const calculateAttendanceLeaderboardPoints = ({ attendanceCategory, timingStatus, approvedOvertime = false }) => {
  const base = { fullDay: 20, halfDay: 10, absent: 0 }[attendanceCategory] || 0;
  const timing = attendanceCategory === 'fullDay' || attendanceCategory === 'halfDay'
    ? (timingStatus === 'onTime' ? 5 : timingStatus === 'arrivedLate' ? -5 : 0)
    : 0;
  return Math.max(0, Math.min(30, base + timing + (base > 0 && approvedOvertime ? 5 : 0)));
};

const eligibleDayState = async (employee, date, sources) => {
  const dateKey = key(date);
  const shift = await getEmployeeShiftForDate(employee._id, date);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toLowerCase();
  const holiday = sources.holidays.some((item) => key(item.date) === dateKey);
  const dayOff = sources.dayOffs.some((item) => key(item.date) === dateKey);
  const weekOff = (shift?.weekOff || []).some((item) => String(item).toLowerCase() === weekday);
  const leave = sources.leaves.some((item) => {
    const start = key(item.singleDate || item.startDate);
    const end = key(item.singleDate || item.endDate || item.startDate);
    return dateKey >= start && dateKey <= end;
  });
  const attendance = sources.attendance.find((item) => key(item.attendanceDay || item.date) === dateKey);
  const overtime = sources.overtime.some((item) => key(item.OvertimeDate || item.requestedDate) === dateKey);
  if (holiday || dayOff || weekOff) return { category: 'neutral' };
  if (leave) return { category: 'leave' };
  if (!attendance) return { category: 'missing' };
  return {
    category: attendance.attendanceCategory,
    attendance,
    points: calculateAttendanceLeaderboardPoints({
      attendanceCategory: attendance.attendanceCategory,
      timingStatus: attendance.timingStatus || attendance.attendanceStatus,
      approvedOvertime: overtime,
    }),
  };
};

const loadSources = async (employeeId, from, to) => Promise.all([
  Attendance.find({ employeeId, $or: [{ attendanceDay: { $gte: from, $lte: to } }, { attendanceDay: { $exists: false }, date: { $gte: from, $lte: to } }] }).sort({ createdAt: 1 }).lean(),
  LeaveRequests.find({ employeeId, status: 'approved', $or: [{ singleDate: { $gte: from, $lte: to } }, { startDate: { $lte: to }, endDate: { $gte: from } }] }).lean(),
  Holiday.find({ status: true, date: { $gte: from, $lte: to }, $or: [{ people: { $size: 0 } }, { people: employeeId }] }).lean(),
  DayOff.find({ employeeId, status: true, date: { $gte: from, $lte: to } }).lean(),
  Overtime.find({ employeeId, status: 'approved', OvertimeDate: { $gte: from, $lte: to } }).lean(),
]);

const calculateCurrentAttendanceStreak = async (employeeId, referenceDate, sources) => {
  const employee = await User.findById(employeeId).lean();
  let streak = 0;
  for (let offset = 0; offset < 365; offset += 1) {
    const state = await eligibleDayState(employee, addDays(referenceDate, -offset), sources);
    if (state.category === 'neutral' || state.category === 'leave') continue;
    if (state.category === 'fullDay' || state.category === 'halfDay') streak += 1;
    else break;
  }
  return streak;
};

const calculateLeaderboardBadges = async (employee, referenceDate, sources) => {
  const start = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1));
  let presentDays = 0;
  let hasAbsent = false;
  let hasLate = false;
  let perfect = true;
  for (let cursor = start; cursor <= referenceDate; cursor = addDays(cursor, 1)) {
    const state = await eligibleDayState(employee, cursor, sources);
    if (state.category === 'neutral' || state.category === 'leave') continue;
    if (state.category === 'missing') {
      perfect = false;
      continue;
    }
    if (state.category === 'absent') {
      hasAbsent = true;
      perfect = false;
      continue;
    }
    if (state.category === 'fullDay' || state.category === 'halfDay') {
      presentDays += 1;
      const timing = state.attendance.timingStatus || state.attendance.attendanceStatus;
      if (timing === 'arrivedLate') {
        hasLate = true;
        perfect = false;
      }
    } else {
      perfect = false;
    }
  }
  const details = [
    { key: 'punctualPro', label: 'Punctual Pro', earned: false },
    { key: 'attendanceStreak', label: 'Attendance Streak', earned: false },
    { key: 'zeroAbsenceChamp', label: 'Zero Absence Champ', earned: presentDays > 0 && !hasAbsent },
    { key: 'perfectMonth', label: 'Perfect Month', earned: presentDays > 0 && perfect },
    { key: 'neverLate', label: 'Never Late', earned: presentDays > 0 && !hasLate },
  ];
  return details;
};

const queryAttendanceLeaderboard = async ({ date = new Date(), search, role = 'employee', page = 1, limit = 10 }) => {
  const referenceDate = day(date);
  const weekStart = monday(referenceDate);
  const weekEnd = addDays(weekStart, 6);
  const userFilter = { role: { $in: role === 'employee' || role === 'staff' ? [role] : ['employee', 'staff'] }, isDeleted: { $ne: true }, isActive: 'Active' };
  if (search) userFilter.$or = [{ name: { $regex: search, $options: 'i' } }, { employeeId: { $regex: search, $options: 'i' } }];
  const users = await User.find(userFilter).select('name employeeId role profilePic workInformation').sort({ name: 1 }).lean();
  const rows = [];
  for (const employee of users) {
    const [records, leaves, holidays, dayOffs, overtime] = await loadSources(employee._id, addDays(referenceDate, -364), weekEnd);
    const sources = { attendance: records, leaves, holidays, dayOffs, overtime };
    let weekTotalPoints = 0;
    for (let offset = 0; offset < 7; offset += 1) weekTotalPoints += (await eligibleDayState(employee, addDays(weekStart, offset), sources)).points || 0;
    const today = await eligibleDayState(employee, referenceDate, sources);
    const streak = await calculateCurrentAttendanceStreak(employee._id, referenceDate, sources);
    let punctual = 0;
    let present = 0;
    for (let offset = 0; offset < 365 && (punctual < 5 || present < 7); offset += 1) {
      const state = await eligibleDayState(employee, addDays(referenceDate, -offset), sources);
      if (state.category === 'neutral' || state.category === 'leave') continue;
      if (state.category !== 'fullDay' && state.category !== 'halfDay') { punctual = 0; present = 0; break; }
      present += 1;
      punctual = (state.attendance.timingStatus || state.attendance.attendanceStatus) === 'arrivedLate' ? 0 : punctual + 1;
    }
    const badgeDetails = await calculateLeaderboardBadges(employee, referenceDate, sources);
    const badges = [];
    if (punctual >= 5) badges.push('Punctual Pro');
    if (present >= 7) badges.push('Attendance Streak');
    badgeDetails[0].earned = punctual >= 5;
    badgeDetails[1].earned = present >= 7;
    badgeDetails.filter((badge) => badge.earned && !badges.includes(badge.label)).forEach((badge) => badges.push(badge.label));
    rows.push({ userId: employee._id, name: employee.name, employeeId: employee.employeeId, role: employee.role, profilePic: employee.profilePic || null, rank: 0, todayPoints: today.points || 0, weekTotalPoints, badges, badgeDetails, currentStreak: streak });
  }
  rows.sort((a, b) => b.weekTotalPoints - a.weekTotalPoints || b.todayPoints - a.todayPoints || a.name.localeCompare(b.name));
  rows.forEach((row, index) => { row.rank = index + 1; });
  const numericPage = Math.max(1, Number(page) || 1); const numericLimit = Math.max(1, Number(limit) || 10);
  return { results: rows.slice((numericPage - 1) * numericLimit, numericPage * numericLimit), page: numericPage, limit: numericLimit, totalPages: Math.ceil(rows.length / numericLimit), totalResults: rows.length, date: key(referenceDate) };
};

/**
 * Create leaderboard entry
 * @param {Object} body
 * @returns {Promise<Leaderboard>}
 */
const createLeaderboard = async (body) => {
  return Leaderboard.create(body);
};

/**
 * Query for leaderboard entries with search support.
 *
 * Filter keys:
 *   search — regex across linked user's name, email, employeeId
 *   user   — exact ObjectId match on the user field
 *
 * @param {Object} filter
 * @param {Object} options - sortBy, limit, page
 * @returns {Promise<QueryResult>}
 */
const queryLeaderboards = async (filter, options) => {
  const { User } = require('../models');
  const mongoFilter = {};

  // Search — resolve matching user IDs first
  if (filter.search) {
    const regex = { $regex: filter.search, $options: 'i' };
    const matchedUsers = await User.find(
      { $or: [{ name: regex }, { email: regex }, { employeeId: regex }] },
      { _id: 1 }
    ).lean();
    const userIds = matchedUsers.map((u) => u._id);
    mongoFilter.user = { $in: userIds };
  }

  // Direct user filter
  if (filter.user && !filter.search) {
    mongoFilter.user = filter.user;
  }

  const paginateOptions = { ...options, populate: 'user' };
  return Leaderboard.paginate(mongoFilter, paginateOptions);
};

/**
 * Get leaderboard by id
 * @param {ObjectId} id
 * @returns {Promise<Leaderboard>}
 */
const getLeaderboardById = async (id) => {
  return Leaderboard.findById(id).populate('user');
};

/**
 * Get leaderboard by user id
 * @param {ObjectId} userId
 * @returns {Promise<Leaderboard>}
 */
const getLeaderboardByUserId = async (userId) => {
  return Leaderboard.findOne({ user: userId }).populate('user');
};

/**
 * Update leaderboard by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<Leaderboard>}
 */
const updateLeaderboardById = async (id, updateBody) => {
  const leaderboard = await getLeaderboardById(id);
  if (!leaderboard) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Leaderboard entry not found');
  }
  Object.assign(leaderboard, updateBody);
  await leaderboard.save();
  return leaderboard;
};

/**
 * Delete leaderboard by id
 * @param {ObjectId} id
 * @returns {Promise<Leaderboard>}
 */
const deleteLeaderboardById = async (id) => {
  const leaderboard = await getLeaderboardById(id);
  if (!leaderboard) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Leaderboard entry not found');
  }
  await leaderboard.remove();
  return leaderboard;
};

module.exports = {
  calculateAttendanceLeaderboardPoints,
  calculateCurrentAttendanceStreak,
  calculateLeaderboardBadges,
  queryAttendanceLeaderboard,
  createLeaderboard,
  queryLeaderboards,
  getLeaderboardById,
  getLeaderboardByUserId,
  updateLeaderboardById,
  deleteLeaderboardById,
};
