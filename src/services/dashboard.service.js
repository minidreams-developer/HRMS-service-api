const mongoose = require('mongoose');
const { User, Attendance, LeaveRequests, Overtime, Payroll } = require('../models');

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Build UTC start/end for a single calendar day. */
const dayRange = (date) => {
  const d = new Date(date);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  const end   = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
};

/** Build UTC start/end for a calendar month. */
const monthRange = (month, year) => {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end   = new Date(Date.UTC(year, month,     0, 23, 59, 59, 999));
  return { start, end };
};

/** Return percentage change between current and previous values. */
const pctChange = (current, previous) => {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return parseFloat(((current - previous) / previous * 100).toFixed(1));
};

/** Format a date as "DD-MM" label for chart x-axis. */
const ddmm = (date) => {
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const mon = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}-${mon}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL FILTER HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a base User match query from the global filters object.
 * Supports: branchId, departmentId, teamId.
 *
 * The User model stores these as mixed fields inside workInformation:
 *   workInformation.branch      — can be an ObjectId or a plain value
 *   workInformation.department  — same
 *   workInformation.team        — same
 *
 * We match against both the raw string and the ObjectId form so the filter
 * works regardless of how the value was originally saved.
 */
const buildUserFilterQuery = (filters = {}) => {
  const query = { 
    role: { $ne: 'admin' }, 
    isActive: 'Active',
    isDeleted: { $ne: true } // Exclude soft-deleted users
  };

  if (filters.branchId) {
    const id = mongoose.Types.ObjectId.isValid(filters.branchId)
      ? new mongoose.Types.ObjectId(filters.branchId)
      : null;
    query['workInformation.branch'] = id
      ? { $in: [id, filters.branchId] }
      : filters.branchId;
  }

  if (filters.departmentId) {
    const id = mongoose.Types.ObjectId.isValid(filters.departmentId)
      ? new mongoose.Types.ObjectId(filters.departmentId)
      : null;
    query['workInformation.department'] = id
      ? { $in: [id, filters.departmentId] }
      : filters.departmentId;
  }

  if (filters.teamId) {
    const id = mongoose.Types.ObjectId.isValid(filters.teamId)
      ? new mongoose.Types.ObjectId(filters.teamId)
      : null;
    query['workInformation.team'] = id
      ? { $in: [id, filters.teamId] }
      : filters.teamId;
  }

  return query;
};

/**
 * When at least one global filter is active, fetch the set of matching
 * employee _ids and return them as an array of ObjectIds.
 * Returns null when no filters are specified (meaning "all employees").
 */
const getFilteredEmployeeIds = async (filters = {}) => {
  const hasFilter = filters.branchId || filters.departmentId || filters.teamId;
  if (!hasFilter) return null;

  const userQuery = buildUserFilterQuery(filters);
  const users = await User.find(userQuery, { _id: 1 }).lean();
  return users.map((u) => u._id);
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — QUICK STATS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Quick Stats — five cards for a given reference date.
 * When global filters are provided, all counts are scoped to the matching
 * employee subset.
 *
 * @param {Date}   date
 * @param {object} filters  { branchId?, departmentId?, teamId? }
 */
const getQuickStats = async (date = new Date(), filters = {}) => {
  const today     = dayRange(date);
  const yesterday = dayRange(new Date(new Date(date).setUTCDate(new Date(date).getUTCDate() - 1)));

  const curMonth  = new Date(date).getUTCMonth() + 1;
  const curYear   = new Date(date).getUTCFullYear();
  const prevMonth = curMonth === 1 ? 12 : curMonth - 1;
  const prevYear  = curMonth === 1 ? curYear - 1 : curYear;

  const { start: mStart, end: mEnd }   = monthRange(curMonth, curYear);
  const { start: pmStart, end: pmEnd } = monthRange(prevMonth, prevYear);

  // Resolve filtered employee IDs once; null means no filter (all employees)
  const filteredIds = await getFilteredEmployeeIds(filters);

  // Base user query for counting employees
  const baseUserQuery = buildUserFilterQuery(filters);
  const prevUserQuery = { ...buildUserFilterQuery(filters), createdAt: { $lt: today.start } };

  // Attendance / leave / OT employee filter — add $in when a subset is active
  const empFilter = filteredIds ? { $in: filteredIds } : { $exists: true };

  // ── Run all queries in parallel ───────────────────────────────────────────
  const [
    totalEmployees,
    prevTotalEmployees,
    presentToday,
    presentYesterday,
    onLeaveToday,
    onLeaveYesterday,
    otToday,
    otYesterday,
    payrollCurrent,
    payrollPrevious,
  ] = await Promise.all([

    // 1. Total active employees (current)
    User.countDocuments(baseUserQuery),

    // 1. Total active employees (yesterday — proxy for "previous")
    User.countDocuments(prevUserQuery),

    // 2. Present today
    Attendance.distinct('employeeId', {
      employeeId: empFilter,
      date: { $gte: today.start, $lte: today.end },
    }),

    // 2. Present yesterday
    Attendance.distinct('employeeId', {
      employeeId: empFilter,
      date: { $gte: yesterday.start, $lte: yesterday.end },
    }),

    // 3. On leave today
    LeaveRequests.distinct('employeeId', {
      employeeId: empFilter,
      status: 'approved',
      $or: [
        { startDate: { $lte: today.end }, endDate:   { $gte: today.start } },
        { singleDate: { $gte: today.start, $lte: today.end } },
      ],
    }),

    // 3. On leave yesterday
    LeaveRequests.distinct('employeeId', {
      employeeId: empFilter,
      status: 'approved',
      $or: [
        { startDate: { $lte: yesterday.end }, endDate:   { $gte: yesterday.start } },
        { singleDate: { $gte: yesterday.start, $lte: yesterday.end } },
      ],
    }),

    // 4. OT employees today
    Overtime.distinct('employeeId', {
      employeeId: empFilter,
      status: 'approved',
      OvertimeDate: { $gte: today.start, $lte: today.end },
    }),

    // 4. OT employees yesterday
    Overtime.distinct('employeeId', {
      employeeId: empFilter,
      status: 'approved',
      OvertimeDate: { $gte: yesterday.start, $lte: yesterday.end },
    }),

    // 5. Payroll total — current month
    Payroll.aggregate([
      {
        $match: {
          ...(filteredIds ? { employeeId: { $in: filteredIds } } : {}),
          month: curMonth,
          year: curYear,
          status: { $in: ['processed', 'paid'] },
        },
      },
      {
        $group: {
          _id: null,
          totalPay: {
            $sum: {
              $subtract: [
                { $add: ['$snapshot.earnedWages', '$snapshot.overtimeAmount', '$extras', '$otherWages'] },
                { $add: ['$penalties', '$loanAndAdvance', '$otherDeductions'] },
              ],
            },
          },
        },
      },
    ]),

    // 5. Payroll total — previous month
    Payroll.aggregate([
      {
        $match: {
          ...(filteredIds ? { employeeId: { $in: filteredIds } } : {}),
          month: prevMonth,
          year: prevYear,
          status: { $in: ['processed', 'paid'] },
        },
      },
      {
        $group: {
          _id: null,
          totalPay: {
            $sum: {
              $subtract: [
                { $add: ['$snapshot.earnedWages', '$snapshot.overtimeAmount', '$extras', '$otherWages'] },
                { $add: ['$penalties', '$loanAndAdvance', '$otherDeductions'] },
              ],
            },
          },
        },
      },
    ]),
  ]);

  const curPayroll  = payrollCurrent[0]?.totalPay  || 0;
  const prevPayroll = payrollPrevious[0]?.totalPay || 0;

  return {
    totalEmployees: {
      count: totalEmployees,
      percentageChange: pctChange(totalEmployees, prevTotalEmployees),
      trend: totalEmployees >= prevTotalEmployees ? 'up' : 'down',
    },
    presentToday: {
      count: presentToday.length,
      percentageChange: pctChange(presentToday.length, presentYesterday.length),
      trend: presentToday.length >= presentYesterday.length ? 'up' : 'down',
    },
    onLeave: {
      count: onLeaveToday.length,
      percentageChange: pctChange(onLeaveToday.length, onLeaveYesterday.length),
      trend: onLeaveToday.length >= onLeaveYesterday.length ? 'up' : 'down',
    },
    otEmployees: {
      count: otToday.length,
      percentageChange: pctChange(otToday.length, otYesterday.length),
      trend: otToday.length >= otYesterday.length ? 'up' : 'down',
    },
    payroll: {
      amount: curPayroll,
      percentageChange: pctChange(curPayroll, prevPayroll),
      trend: curPayroll >= prevPayroll ? 'up' : 'down',
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — ATTENDANCE OVERVIEW  (weekly bar chart)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns daily attendance counts for a 7-day window ending on `endDate`.
 *
 * @param {Date}   endDate
 * @param {object} filters  { branchId?, departmentId?, teamId? }
 */
const getAttendanceOverview = async (endDate = new Date(), filters = {}, period = 'week') => {
  const reference = new Date(endDate);
  const lastDay = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 0));
  const count = period === 'today' ? 1 : period === 'month' ? lastDay.getUTCDate() : 7;
  // Build an array ending on the requested reference date (month starts at day 1).
  const dates = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = period === 'month' ? new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), count - i)) : new Date(endDate);
    if (period !== 'month') d.setUTCDate(d.getUTCDate() - i);
    dates.push(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())));
  }

  const windowStart = dates[0];
  const windowEnd   = new Date(dates[dates.length - 1].getTime() + 86399999);

  // Resolve filtered employee IDs once
  const filteredIds = await getFilteredEmployeeIds(filters);
  const empFilter   = filteredIds ? { $in: filteredIds } : { $exists: true };

  // Fetch all attendance and leave records in the window
  const [attendanceRecords, leaveRecords] = await Promise.all([
    Attendance.find({
      employeeId: empFilter,
      date: { $gte: windowStart, $lte: windowEnd },
    }).lean(),

    LeaveRequests.find({
      employeeId: empFilter,
      status: 'approved',
      $or: [
        { startDate: { $lte: windowEnd }, endDate: { $gte: windowStart } },
        { singleDate: { $gte: windowStart, $lte: windowEnd } },
      ],
    }).lean(),
  ]);

  // Build per-day counts
  const dailyData = dates.map((day) => {
    const dayStart = new Date(day);
    const dayEnd   = new Date(day.getTime() + 86399999);

    const dayAttendance = attendanceRecords.filter((rec) => {
      const recDate = new Date(rec.date);
      return recDate >= dayStart && recDate <= dayEnd;
    });

    const presentCount = dayAttendance.length;
    const lateCount    = dayAttendance.filter((r) => r.attendanceStatus === 'arrivedLate').length;

    const onLeaveCount = leaveRecords.filter((leave) => {
      if (leave.singleDate) {
        const sd = new Date(leave.singleDate);
        return sd >= dayStart && sd <= dayEnd;
      }
      const ls = leave.startDate ? new Date(leave.startDate) : null;
      const le = leave.endDate   ? new Date(leave.endDate)   : null;
      if (ls && le) return ls <= dayEnd && le >= dayStart;
      return false;
    }).length;

    return {
      label: ddmm(day),
      date: day.toISOString().split('T')[0],
      present: presentCount,
      onLeave: onLeaveCount,
      late: lateCount,
    };
  });

  return { dailyData };
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — PAYROLL BREAKDOWN  (current month category split)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns category-level payroll breakdown for a given month/year.
 *
 * @param {number} month
 * @param {number} year
 * @param {object} filters  { branchId?, departmentId?, teamId? }
 */
const getPayrollBreakdown = async (month, year, filters = {}, period = 'month') => {
  const filteredIds = await getFilteredEmployeeIds(filters);
  const range = period === 'today'
    ? dayRange(new Date())
    : period === 'week'
      ? { start: new Date(Date.now() - 6 * 86400000), end: new Date() }
      : null;

  const result = await Payroll.aggregate([
    {
      $match: {
        ...(filteredIds ? { employeeId: { $in: filteredIds } } : {}),
        ...(range ? { createdAt: { $gte: range.start, $lte: range.end } } : { month, year }),
        status: { $in: ['processed', 'paid'] },
      },
    },
    {
      $group: {
        _id: null,
        salary:     { $sum: '$snapshot.earnedWages' },
        overtime:   { $sum: '$snapshot.overtimeAmount' },
        incentives: { $sum: '$extras' },
        allowances: { $sum: '$otherWages' },
        deductions: {
          $sum: { $add: ['$penalties', '$loanAndAdvance', '$otherDeductions'] },
        },
      },
    },
  ]);

  const data = result[0] || {};

  const salary     = data.salary     || 0;
  const overtime   = data.overtime   || 0;
  const incentives = data.incentives || 0;
  const allowances = data.allowances || 0;
  const deductions = data.deductions || 0;

  const totalEarnings = salary + overtime + incentives + allowances;
  const totalPay      = parseFloat((totalEarnings - deductions).toFixed(2));

  const pct = (val) =>
    totalEarnings > 0 ? parseFloat(((val / totalEarnings) * 100).toFixed(1)) : 0;

  return {
    period,
    month,
    year,
    totalPayThisMonth: totalPay,
    categories: {
      salary:     { amount: salary,     percentage: pct(salary) },
      allowances: { amount: allowances, percentage: pct(allowances) },
      deductions: { amount: deductions, percentage: pct(deductions) },
      incentives: { amount: incentives, percentage: pct(incentives) },
      overtime:   { amount: overtime,   percentage: pct(overtime) },
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// COMBINED DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the complete dashboard payload in a single call.
 *
 * @param {Date}   date
 * @param {object} filters  { branchId?, departmentId?, teamId? }
 */
const getDashboard = async (date = new Date(), filters = {}, period = 'today') => {
  const d     = new Date(date);
  const month = d.getUTCMonth() + 1;
  const year  = d.getUTCFullYear();

  const quickStats = await getQuickStats(d, filters);

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      referenceDate: d.toISOString().split('T')[0],
      month,
      year,
      period,
      filters: Object.keys(filters).length ? filters : undefined,
    },
    quickStats,
  };
};

module.exports = {
  getDashboard,
  getQuickStats,
  getAttendanceOverview,
  getPayrollBreakdown,
};
