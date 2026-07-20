const mongoose = require('mongoose');
const { User, Attendance, LeaveRequests, Overtime, Payroll } = require('../models');

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build UTC start/end for a single calendar day.
 */
const dayRange = (date) => {
  const d = new Date(date);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  const end   = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
};

/**
 * Build UTC start/end for a calendar week containing `date` (Mon–Sun).
 */
const weekRange = (date) => {
  const d     = new Date(date);
  const day   = d.getUTCDay(); // 0=Sun,1=Mon,...,6=Sat
  const diff  = day === 0 ? -6 : 1 - day; // shift so week starts Monday
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff, 0, 0, 0, 0));
  const end   = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000 + 86399999);
  return { start, end };
};

/**
 * Build UTC start/end for a calendar month.
 */
const monthRange = (month, year) => {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end   = new Date(Date.UTC(year, month,     0, 23, 59, 59, 999));
  return { start, end };
};

/**
 * Return percentage change between current and previous values.
 */
const pctChange = (current, previous) => {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return parseFloat(((current - previous) / previous * 100).toFixed(1));
};

/**
 * Format a date as "DD-MM" label for chart x-axis.
 */
const ddmm = (date) => {
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const mon = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}-${mon}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — QUICK STATS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Quick Stats computes five cards for a given reference date:
 *   1. Total Employees          — all active non-admin users
 *   2. Present Today            — unique employees with an attendance record today
 *   3. On Leave                 — employees with an approved leave covering today
 *   4. OT Employees             — employees with an approved overtime entry today
 *   5. Payroll (total pay)      — sum of grossEarnings for current month's processed payrolls
 *
 * Each card also includes a percentageChange vs the previous comparable period.
 */
const getQuickStats = async (date = new Date()) => {
  const today    = dayRange(date);
  const yesterday = dayRange(new Date(new Date(date).setUTCDate(new Date(date).getUTCDate() - 1)));

  const curMonth  = new Date(date).getUTCMonth() + 1;
  const curYear   = new Date(date).getUTCFullYear();
  const prevMonth = curMonth === 1 ? 12 : curMonth - 1;
  const prevYear  = curMonth === 1 ? curYear - 1 : curYear;

  const { start: mStart, end: mEnd }    = monthRange(curMonth, curYear);
  const { start: pmStart, end: pmEnd }  = monthRange(prevMonth, prevYear);

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
    User.countDocuments({ role: { $ne: 'admin' }, isActive: true }),

    // 1. Total active employees (yesterday — proxy for "previous")
    User.countDocuments({ role: { $ne: 'admin' }, isActive: true, createdAt: { $lt: today.start } }),

    // 2. Present today — distinct employeeIds in Attendance for today
    Attendance.distinct('employeeId', { date: { $gte: today.start, $lte: today.end } }),

    // 2. Present yesterday
    Attendance.distinct('employeeId', { date: { $gte: yesterday.start, $lte: yesterday.end } }),

    // 3. On leave today — approved leaves that overlap today
    LeaveRequests.distinct('employeeId', {
      status: 'approved',
      $or: [
        { startDate: { $lte: today.end }, endDate:   { $gte: today.start } },
        { singleDate: { $gte: today.start, $lte: today.end } },
      ],
    }),

    // 3. On leave yesterday
    LeaveRequests.distinct('employeeId', {
      status: 'approved',
      $or: [
        { startDate: { $lte: yesterday.end }, endDate:   { $gte: yesterday.start } },
        { singleDate: { $gte: yesterday.start, $lte: yesterday.end } },
      ],
    }),

    // 4. OT employees today — approved overtime entries for today
    Overtime.distinct('employeeId', {
      status: 'approved',
      OvertimeDate: { $gte: today.start, $lte: today.end },
    }),

    // 4. OT employees yesterday
    Overtime.distinct('employeeId', {
      status: 'approved',
      OvertimeDate: { $gte: yesterday.start, $lte: yesterday.end },
    }),

    // 5. Payroll total — current month processed/paid
    Payroll.aggregate([
      { $match: { month: curMonth, year: curYear, status: { $in: ['processed', 'paid'] } } },
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
      { $match: { month: prevMonth, year: prevYear, status: { $in: ['processed', 'paid'] } } },
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
 * Each day has three series:
 *   - present  : attended and NOT on leave
 *   - onLeave  : approved leave overlapping that day
 *   - late     : attendanceStatus === 'arrivedLate'
 */
const getAttendanceOverview = async (endDate = new Date()) => {
  // Build an array of 7 dates ending on endDate
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(endDate);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())));
  }

  const windowStart = dates[0];
  const windowEnd   = new Date(dates[6].getTime() + 86399999); // end of last day

  // Fetch all attendance records in the window in one query
  const attendanceRecords = await Attendance.find({
    date: { $gte: windowStart, $lte: windowEnd },
  }).lean();

  // Fetch all approved leaves that overlap the window
  const leaveRecords = await LeaveRequests.find({
    status: 'approved',
    $or: [
      { startDate: { $lte: windowEnd }, endDate: { $gte: windowStart } },
      { singleDate: { $gte: windowStart, $lte: windowEnd } },
    ],
  }).lean();

  // Build per-day counts
  const dailyData = dates.map((day) => {
    const dayStart = new Date(day);
    const dayEnd   = new Date(day.getTime() + 86399999);

    // Attendance on this day
    const dayAttendance = attendanceRecords.filter((rec) => {
      const recDate = new Date(rec.date);
      return recDate >= dayStart && recDate <= dayEnd;
    });

    const presentCount = dayAttendance.length;
    const lateCount    = dayAttendance.filter((r) => r.attendanceStatus === 'arrivedLate').length;

    // Employees on leave on this day
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
 * Categories: salary, allowances, deductions, incentives, overtime.
 */
const getPayrollBreakdown = async (month, year) => {
  const result = await Payroll.aggregate([
    {
      $match: {
        month,
        year,
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
 * Returns the complete dashboard payload in a single call:
 *   - quickStats         (Today filter)
 *   - attendanceOverview (This Week filter — 7-day window)
 *   - payrollBreakdown   (This Month filter)
 */
const getDashboard = async (date = new Date()) => {
  const d     = new Date(date);
  const month = d.getUTCMonth() + 1;
  const year  = d.getUTCFullYear();

  const [quickStats, attendanceOverview, payrollBreakdown] = await Promise.all([
    getQuickStats(d),
    getAttendanceOverview(d),
    getPayrollBreakdown(month, year),
  ]);

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      referenceDate: d.toISOString().split('T')[0],
      month,
      year,
    },
    quickStats,
    attendanceOverview,
    payrollBreakdown,
  };
};

module.exports = {
  getDashboard,
  getQuickStats,
  getAttendanceOverview,
  getPayrollBreakdown,
};
