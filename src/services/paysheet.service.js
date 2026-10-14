const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { User, Payroll, Paysheet, Attendance, LeaveRequests, ContractorSettlement } = require('../models');
const payrollService = require('./payroll.service');
const ApiError = require('../utils/ApiError');

// Month names for charts
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Calculate percentage change between current and previous values
 */
const calculatePercentageChange = (current, previous) => {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return parseFloat(((current - previous) / previous * 100).toFixed(1));
};

/**
 * Get month range for date queries
 */
const getMonthRange = (month, year) => {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
};

/**
 * Compute quick stats from payroll data
 */
const computeQuickStats = async (month, year, organizationId = null) => {
  const currentMonth = { month, year };
  const previousMonth = month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };
  
  // Build match stage for aggregation
  const buildMatchStage = (monthData) => {
    const match = {
      month: monthData.month,
      year: monthData.year,
      status: { $in: ['processed', 'paid'] }
    };
    if (organizationId) match.organizationId = new mongoose.Types.ObjectId(organizationId);
    return match;
  };

  // Current month aggregation
  const currentStats = await Payroll.aggregate([
    { $match: buildMatchStage(currentMonth) },
    {
      $lookup: {
        from: 'users',
        localField: 'employeeId',
        foreignField: '_id',
        as: 'employee'
      }
    },
    { $unwind: '$employee' },
    {
      $group: {
        _id: null,
        totalSalary: { $sum: '$snapshot.grossWages' },
        totalIncentives: { $sum: { $add: ['$extras', '$otherWages'] } },
        totalDeductions: { $sum: { $add: ['$penalties', '$loanAndAdvance', '$otherDeductions'] } },
        payableEmployees: { $sum: { $cond: [{ $eq: ['$status', 'processed'] }, 1, 0] } },
        onHoldEmployees: { $sum: 0 },
      }
    }
  ]);

  // Previous month aggregation for comparison
  const previousStats = await Payroll.aggregate([
    { $match: buildMatchStage(previousMonth) },
    {
      $lookup: {
        from: 'users',
        localField: 'employeeId',
        foreignField: '_id',
        as: 'employee'
      }
    },
    { $unwind: '$employee' },
    {
      $group: {
        _id: null,
        totalSalary: { $sum: '$snapshot.grossWages' },
        totalIncentives: { $sum: { $add: ['$extras', '$otherWages'] } },
        totalDeductions: { $sum: { $add: ['$penalties', '$loanAndAdvance', '$otherDeductions'] } },
        payableEmployees: { $sum: { $cond: [{ $eq: ['$status', 'processed'] }, 1, 0] } },
        onHoldEmployees: { $sum: 0 },
      }
    }
  ]);

  const current = currentStats[0] || {};
  const previous = previousStats[0] || {};
  const [currentHold, previousHold] = await Promise.all([
    Payroll.countDocuments({ ...buildMatchStage(currentMonth), status: 'stopped' }),
    Payroll.countDocuments({ ...buildMatchStage(previousMonth), status: 'stopped' }),
  ]);

  return {
    totalSalary: {
      amount: current.totalSalary || 0,
      percentageChange: calculatePercentageChange(current.totalSalary || 0, previous.totalSalary || 0)
    },
    totalIncentive: {
      amount: current.totalIncentives || 0,
      percentageChange: calculatePercentageChange(current.totalIncentives || 0, previous.totalIncentives || 0)
    },
    totalDeductions: {
      amount: current.totalDeductions || 0,
      percentageChange: calculatePercentageChange(current.totalDeductions || 0, previous.totalDeductions || 0)
    },
    payableEmployees: {
      count: current.payableEmployees || 0,
      percentageChange: calculatePercentageChange(current.payableEmployees || 0, previous.payableEmployees || 0)
    },
    onHoldEmployees: {
      count: currentHold,
      percentageChange: calculatePercentageChange(currentHold, previousHold)
    }
  };
};

/**
 * Compute payroll overview (yearly monthly breakdown)
 */
const computePayrollOverview = async (year, organizationId = null) => {
  const matchStage = {
    year,
    status: { $in: ['processed', 'paid'] }
  };
  if (organizationId) matchStage.organizationId = new mongoose.Types.ObjectId(organizationId);

  const monthlyBreakdown = await Payroll.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: 'users',
        localField: 'employeeId',
        foreignField: '_id',
        as: 'employee'
      }
    },
    { $unwind: '$employee' },
    {
      $group: {
        _id: '$month',
        salary: { $sum: '$snapshot.grossWages' },
        overtime: { $sum: '$snapshot.overtimeAmount' },
        incentives: { $sum: { $add: ['$extras', '$otherWages'] } },
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Fill in missing months with zero values
  const monthlyData = [];
  let totalPayThisYear = 0;

  for (let i = 1; i <= 12; i++) {
    const monthData = monthlyBreakdown.find(m => m._id === i);
    const monthTotal = (monthData?.salary || 0) + (monthData?.overtime || 0) + (monthData?.incentives || 0);
    totalPayThisYear += monthTotal;

    monthlyData.push({
      month: MONTH_NAMES[i - 1],
      salary: monthData?.salary || 0,
      overtime: monthData?.overtime || 0,
      incentives: monthData?.incentives || 0,
    });
  }

  return {
    totalPayThisYear,
    monthlyData
  };
};

/**
 * Compute payroll breakdown (category-wise)
 */
const computePayrollBreakdown = async (month, year, organizationId = null) => {
  const matchStage = {
    month,
    year,
    status: { $in: ['processed', 'paid'] }
  };
  if (organizationId) matchStage.organizationId = new mongoose.Types.ObjectId(organizationId);

  const breakdown = await Payroll.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: 'users',
        localField: 'employeeId',
        foreignField: '_id',
        as: 'employee'
      }
    },
    { $unwind: '$employee' },
    {
      $group: {
        _id: null,
        salary: { $sum: '$snapshot.earnedWages' },
        allowances: { 
          $sum: { 
            $subtract: ['$snapshot.grossWages', '$snapshot.earnedWages'] 
          } 
        },
        deductions: { $sum: { $add: ['$penalties', '$loanAndAdvance', '$otherDeductions'] } },
        incentives: { $sum: '$extras' },
        overtime: { $sum: '$snapshot.overtimeAmount' },
        otherWages: { $sum: '$otherWages' },
      }
    }
  ]);

  const data = breakdown[0] || {};
  const contractorFilter = { month, year, status: { $in: ['processed', 'paid'] } };
  const contractorRows = await ContractorSettlement.find(contractorFilter).select('totalShare').lean();
  const contractorAmount = contractorRows.reduce((sum, row) => sum + (Number(row.totalShare) || 0), 0);
  
  // Calculate totals
  const totalEarnings = (data.salary || 0) + (data.allowances || 0) + (data.incentives || 0) + (data.overtime || 0) + (data.otherWages || 0);
  const totalPayThisMonth = totalEarnings - (data.deductions || 0);

  // Calculate percentages
  const calculatePercentage = (amount) => totalEarnings > 0 ? parseFloat((amount / totalEarnings * 100).toFixed(1)) : 0;

  return {
    totalPayThisMonth,
    categories: {
      salary: {
        amount: data.salary || 0,
        percentage: calculatePercentage(data.salary || 0)
      },
      allowances: {
        amount: (data.allowances || 0) + (data.otherWages || 0), // Combine allowances and other wages
        percentage: calculatePercentage((data.allowances || 0) + (data.otherWages || 0))
      },
      deductions: {
        amount: data.deductions || 0,
        percentage: calculatePercentage(data.deductions || 0)
      },
      incentives: {
        amount: data.incentives || 0,
        percentage: calculatePercentage(data.incentives || 0)
      },
      overtime: {
        amount: data.overtime || 0,
        percentage: calculatePercentage(data.overtime || 0)
      }
      ,contractors: { amount: Number(contractorAmount.toFixed(2)), percentage: calculatePercentage(contractorAmount) },
      agentsCommission: { amount: null, percentage: null, payoutAvailable: false },
    }
  };
};

const getAttendanceOverview = async (month, year) => {
  month = parseInt(month, 10) || new Date().getUTCMonth() + 1;
  year = parseInt(year, 10) || new Date().getUTCFullYear();
  const { start, end } = getMonthRange(month, year);
  const [attendance, approvedLeave] = await Promise.all([
    Attendance.find({ date: { $gte: start, $lte: end } }).select('date attendanceCategory timingStatus').lean(),
    LeaveRequests.find({ status: 'approved', $or: [{ singleDate: { $gte: start, $lte: end } }, { startDate: { $lte: end }, endDate: { $gte: start } }] }).select('singleDate startDate endDate').lean(),
  ]);
  const days = new Map();
  const keyFor = (date) => new Date(date).toISOString().slice(0, 10);
  attendance.forEach((row) => {
    const key = keyFor(row.date); const item = days.get(key) || { date: key, present: 0, onLeave: 0, late: 0 };
    if (['fullDay', 'halfDay'].includes(row.attendanceCategory)) item.present += 1;
    if (row.timingStatus === 'arrivedLate') item.late += 1;
    days.set(key, item);
  });
  approvedLeave.forEach((leave) => {
    const from = new Date(leave.singleDate || leave.startDate || start); const to = new Date(leave.singleDate || leave.endDate || from);
    for (let date = new Date(Math.max(from.getTime(), start.getTime())); date <= Math.min(to.getTime(), end.getTime()); date.setUTCDate(date.getUTCDate() + 1)) {
      const key = keyFor(date); const item = days.get(key) || { date: key, present: 0, onLeave: 0, late: 0 }; item.onLeave += 1; days.set(key, item);
    }
  });
  return { period: { month, year }, results: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)) };
};

/**
 * Generate or refresh paysheet data for a given month/year
 */
const generatePaysheet = async (month, year, organizationId = null) => {
  const [quickStats, payrollOverview, payrollBreakdown] = await Promise.all([
    computeQuickStats(month, year, organizationId),
    computePayrollOverview(year, organizationId),
    computePayrollBreakdown(month, year, organizationId)
  ]);

  // Count total employees and processed payrolls for metadata
  const matchStage = { month, year };
  if (organizationId) matchStage.organizationId = new mongoose.Types.ObjectId(organizationId);

  const [employeeCount, processedPayrolls, lastPayroll] = await Promise.all([
    User.countDocuments({ 
      role: { $ne: 'admin' }, 
      isActive: true,
      isDeleted: { $ne: true } // Exclude soft-deleted users
    }),
    Payroll.countDocuments({ ...matchStage, status: { $in: ['processed', 'paid'] } }),
    Payroll.findOne(matchStage).sort({ updatedAt: -1 }).select('updatedAt').lean()
  ]);

  const paysheetData = {
    month,
    year,
    organizationId,
    quickStats,
    payrollOverview: {
      totalPayThisMonth: payrollBreakdown.totalPayThisMonth,
      monthlyData: payrollOverview.monthlyData
    },
    payrollBreakdown,
    computedAt: new Date(),
    dataSource: {
      employeeCount,
      processedPayrolls,
      lastPayrollUpdate: lastPayroll?.updatedAt || null
    }
  };

  // Upsert paysheet record
  const paysheet = await Paysheet.findOneAndUpdate(
    { month, year, organizationId },
    paysheetData,
    { new: true, upsert: true, runValidators: true }
  );

  return paysheet;
};

/**
 * Get paysheet dashboard data
 */
const getPaysheetDashboard = async (month, year, organizationId = null, forceRefresh = false) => {
  month = parseInt(month, 10) || new Date().getMonth() + 1;
  year = parseInt(year, 10) || new Date().getFullYear();

  // Check if we have cached data
  let paysheet = await Paysheet.findOne({ month, year, organizationId });

  // Generate new data if not exists, forced refresh, or data is older than 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  if (!paysheet || forceRefresh || paysheet.computedAt < oneHourAgo) {
    paysheet = await generatePaysheet(month, year, organizationId);
  }

  return {
    period: { month, year },
    ...paysheet.toObject(),
    refreshedAt: paysheet.computedAt,
    dataFreshness: paysheet.computedAt > oneHourAgo ? 'fresh' : 'stale'
  };
};

/**
 * Get quick stats only
 */
const getQuickStats = async (month, year, organizationId = null) => {
  const dashboard = await getPaysheetDashboard(month, year, organizationId);
  return {
    period: dashboard.period,
    quickStats: dashboard.quickStats,
    dataSource: dashboard.dataSource
  };
};

/**
 * Get payroll overview only (for charts)
 */
const getPayrollOverview = async (year, organizationId = null) => {
  year = parseInt(year, 10) || new Date().getFullYear();
  
  // Try to get from any month's paysheet first (they all have the same yearly data)
  let paysheet = await Paysheet.findOne({ year, organizationId }).sort({ computedAt: -1 });
  
  if (!paysheet) {
    // Generate fresh data for current month
    const currentMonth = new Date().getMonth() + 1;
    paysheet = await generatePaysheet(currentMonth, year, organizationId);
  }

  return {
    year,
    totalPayThisYear: paysheet.payrollOverview.monthlyData.reduce(
      (sum, month) => sum + month.salary + month.overtime + month.incentives, 
      0
    ),
    monthlyData: paysheet.payrollOverview.monthlyData,
    computedAt: paysheet.computedAt
  };
};

/**
 * Get payroll breakdown only
 */
const getPayrollBreakdown = async (month, year, organizationId = null) => {
  const dashboard = await getPaysheetDashboard(month, year, organizationId);
  return {
    period: dashboard.period,
    payrollBreakdown: dashboard.payrollBreakdown,
    computedAt: dashboard.computedAt
  };
};

/**
 * Refresh paysheet data (force recomputation)
 */
const refreshPaysheet = async (month, year, organizationId = null) => {
  return await generatePaysheet(month, year, organizationId);
};

// ─────────────────────────────────────────────────────────────────────────────
// PAYROLL LIST  (Screen 2 — table with name, dept, issue date, salary, OT, total, status)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Paginated payroll list for the table view.
 * Each row = one employee's payroll for the requested month/year.
 * Columns: name, employeeId, profilePic, designation, department,
 *          issueDate, salary, OT, total, status
 */
const getPayrollList = async (query, options) => {
  const month  = parseInt(query.month,  10) || new Date().getMonth() + 1;
  const year   = parseInt(query.year,   10) || new Date().getFullYear();
  const limit  = parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : 10;
  const page   = parseInt(options.page,  10) > 0 ? parseInt(options.page,  10) : 1;
  const skip   = (page - 1) * limit;

  // Build match for payroll records
  const payrollMatch = { month, year };
  if (query.status) payrollMatch.status = query.status;

  // Sort stage
  let sort = { createdAt: -1 };
  if (options.sortBy) {
    sort = {};
    options.sortBy.split(',').forEach((opt) => {
      const [key, order] = opt.split(':');
      sort[key] = order === 'desc' ? -1 : 1;
    });
  }

  // Build lookup pipeline
  const pipeline = [
    { $match: payrollMatch },
    // Join employee details
    {
      $lookup: {
        from: 'users',
        localField: 'employeeId',
        foreignField: '_id',
        as: 'employee',
      },
    },
    { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
    // Join department details
    {
      $lookup: {
        from: 'departments',
        let: { deptId: '$employee.workInformation.department' },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [
                  '$_id',
                  {
                    $cond: {
                      if: { $eq: [{ $type: '$$deptId' }, 'objectId'] },
                      then: '$$deptId',
                      else: { $convert: { input: '$$deptId', to: 'objectId', onError: null, onNull: null } },
                    },
                  },
                ],
              },
            },
          },
          { $project: { departmentName: 1 } },
        ],
        as: 'department',
      },
    },
    { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
    // Apply search filter after lookup
    ...(query.search
      ? [
          {
            $match: {
              $or: [
                { 'employee.name':       { $regex: query.search, $options: 'i' } },
                { 'employee.employeeId': { $regex: query.search, $options: 'i' } },
              ],
            },
          },
        ]
      : []),
    // Apply department filter
    ...(query.departmentId && mongoose.Types.ObjectId.isValid(query.departmentId)
      ? [{ $match: { 'department._id': new mongoose.Types.ObjectId(query.departmentId) } }]
      : []),
    // Project final shape
    {
      $project: {
        _id: 1,
        month: 1,
        year: 1,
        status: 1,
        createdAt: 1,
        // Employee info
        employeeId:  '$employee._id',
        empCode:     '$employee.employeeId',
        name:        '$employee.name',
        profilePic:  '$employee.profilePic',
        designation: '$employee.workInformation.designation',
        department:  '$department.departmentName',
        // Financials
        issueDate:   '$createdAt',
        salary: {
          $subtract: [
            { $add: ['$snapshot.earnedWages', '$otherWages'] },
            { $add: ['$penalties', '$loanAndAdvance', '$otherDeductions'] },
          ],
        },
        overtime:    '$snapshot.overtimeAmount',
        total: {
          $subtract: [
            { $add: ['$snapshot.earnedWages', '$snapshot.overtimeAmount', '$extras', '$otherWages'] },
            { $add: ['$penalties', '$loanAndAdvance', '$otherDeductions'] },
          ],
        },
      },
    },
    { $sort: sort },
  ];

  // Count before pagination
  const countPipeline = [...pipeline, { $count: 'total' }];
  const [countResult, rows] = await Promise.all([
    Payroll.aggregate(countPipeline),
    Payroll.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
  ]);

  const totalResults = countResult[0]?.total || 0;

  return {
    results: rows,
    page,
    limit,
    totalPages: Math.ceil(totalResults / limit),
    totalResults,
    month,
    year,
  };
};

/**
 * Get single payroll row with full breakdown detail.
 */
const getPayrollDetail = async (payrollId) => {
  const rows = await Payroll.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(payrollId) } },
    {
      $lookup: {
        from: 'users',
        localField: 'employeeId',
        foreignField: '_id',
        as: 'employee',
      },
    },
    { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'departments',
        let: { deptId: '$employee.workInformation.department' },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [
                  '$_id',
                  {
                    $cond: {
                      if: { $eq: [{ $type: '$$deptId' }, 'objectId'] },
                      then: '$$deptId',
                      else: { $convert: { input: '$$deptId', to: 'objectId', onError: null, onNull: null } },
                    },
                  },
                ],
              },
            },
          },
          { $project: { departmentName: 1 } },
        ],
        as: 'department',
      },
    },
    { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        month: 1,
        year: 1,
        status: 1,
        remarks: 1,
        extras: 1,
        penalties: 1,
        loanAndAdvance: 1,
        otherDeductions: 1,
        otherWages: 1,
        snapshot: 1,
        stopDetails: 1,
        createdAt: 1,
        updatedAt: 1,
        employee: {
          _id:        '$employee._id',
          employeeId: '$employee.employeeId',
          name:       '$employee.name',
          profilePic: '$employee.profilePic',
          email:      '$employee.email',
          phone:      '$employee.phone',
          designation: '$employee.workInformation.designation',
        },
        department:  '$department.departmentName',
        issueDate:   '$createdAt',
        salary: {
          $subtract: [
            { $add: ['$snapshot.earnedWages', '$otherWages'] },
            { $add: ['$penalties', '$loanAndAdvance', '$otherDeductions'] },
          ],
        },
        overtime: '$snapshot.overtimeAmount',
        total: {
          $subtract: [
            { $add: ['$snapshot.earnedWages', '$snapshot.overtimeAmount', '$extras', '$otherWages'] },
            { $add: ['$penalties', '$loanAndAdvance', '$otherDeductions'] },
          ],
        },
      },
    },
  ]);

  if (!rows.length) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Payroll record not found');
  }
  return rows[0];
};

/**
 * Update the status of a payroll record (paid / pending / cancelled).
 */
const updatePayrollStatus = async (payrollId, status, actorId) => payrollService.updatePayrollStatus(payrollId, status, actorId);

module.exports = {
  getPaysheetDashboard,
  getQuickStats,
  getPayrollOverview,
  getPayrollBreakdown,
  getAttendanceOverview,
  generatePaysheet,
  refreshPaysheet,
  getPayrollList,
  getPayrollDetail,
  updatePayrollStatus,
};
