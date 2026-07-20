const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { User, Attendance, LeaveRequests, Overtime, Payroll } = require('../models');
const ApiError = require('../utils/ApiError');

// Working days per month used for daily-rate calculation (industry standard: 26)
const WORKING_DAYS_PER_MONTH = 26;

// Overtime rate multiplier (1.5x of daily rate per hour, assuming 8h day)
const OVERTIME_HOURLY_MULTIPLIER = 1.5;
const WORK_HOURS_PER_DAY = 8;

// Leave types that are considered "paid"
const PAID_LEAVE_TYPES = ['paidLeave', 'paid_leave', 'PaidLeave', 'casual', 'sick', 'annual', 'CL', 'SL', 'EL'];

/**
 * Build the start and end Date objects for a given month/year (UTC).
 */
const getMonthRange = (month, year) => {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)); // last day of month
  return { start, end };
};

/**
 * Classify an attendance record as fullDay | halfDay | absent based on
 * totalWorkedHours relative to WORK_HOURS_PER_DAY.
 *   >= 75% of shift  → fullDay
 *   >= 25% of shift  → halfDay
 *   <  25%           → absent (off day)
 */
const classifyAttendance = (totalWorkedHours) => {
  const full = WORK_HOURS_PER_DAY;
  const halfMark = full * 0.25;
  const fullMark = full * 0.75;
  if (totalWorkedHours >= fullMark) return 'fullDay';
  if (totalWorkedHours >= halfMark) return 'halfDay';
  return 'absent';
};

// ─────────────────────────────────────────────────────────────────────────────
// CORE PAYROLL COMPUTATION (per employee, per month)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute payroll figures for a single employee for a given month/year.
 * Pulls live data from Attendance, LeaveRequests, Overtime collections.
 */
const computePayrollForEmployee = async (employee, month, year, payrollOverride = null) => {
  const { start, end } = getMonthRange(month, year);
  const employeeObjectId = employee._id;

  // ── 1. Attendance counts ──────────────────────────────────────────────────
  const attendanceRecords = await Attendance.find({
    employeeId: employeeObjectId,
    date: { $gte: start, $lte: end },
  }).lean();

  let fullDays = 0;
  let halfDays = 0;
  let offDays = 0;

  for (const rec of attendanceRecords) {
    const classification = classifyAttendance(rec.totalWorkedHours || 0);
    if (classification === 'fullDay') fullDays++;
    else if (classification === 'halfDay') halfDays++;
    else offDays++;
  }

  // ── 2. Leave counts ───────────────────────────────────────────────────────
  const leaveRecords = await LeaveRequests.find({
    employeeId: employeeObjectId,
    status: 'approved',
    $or: [
      { startDate: { $gte: start, $lte: end } },
      { endDate: { $gte: start, $lte: end } },
      { singleDate: { $gte: start, $lte: end } },
    ],
  }).lean();

  let paidLeaves = 0;
  let unpaidLeaves = 0;

  for (const leave of leaveRecords) {
    // Count the number of leave days that fall within this month
    let leaveDays = 1;
    if (leave.startDate && leave.endDate) {
      const leaveStart = leave.startDate < start ? start : leave.startDate;
      const leaveEnd = leave.endDate > end ? end : leave.endDate;
      const diffMs = leaveEnd - leaveStart;
      leaveDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
    }

    const isPaid = PAID_LEAVE_TYPES.some((t) =>
      (leave.leaveType || '').toLowerCase().includes(t.toLowerCase())
    );
    if (isPaid) paidLeaves += leaveDays;
    else unpaidLeaves += leaveDays;
  }

  // ── 3. Overtime ───────────────────────────────────────────────────────────
  const overtimeRecords = await Overtime.find({
    employeeId: employeeObjectId,
    status: 'approved',
    OvertimeDate: { $gte: start, $lte: end },
  }).lean();

  const totalOvertimeHours = overtimeRecords.reduce(
    (sum, rec) => sum + (rec.totalDuration || 0),
    0
  );

  // ── 4. Salary & daily rate ────────────────────────────────────────────────
  let basicSalary = 0;
  let monthlyCTC = 0;
  let hra = 0;
  let conveyance = 0;
  let specialAllowance = 0;
  let otherAllowance = 0;

  const salaryDetails = employee.workInformation?.SalaryDetails;
  if (salaryDetails && typeof salaryDetails === 'object') {
    basicSalary = salaryDetails.basicSalary || 0;
    monthlyCTC = salaryDetails.monthlyCTC || 0;
    hra = salaryDetails.houseRentAllowance || 0;
    conveyance = salaryDetails.conveyanceAllowance || 0;
    specialAllowance = salaryDetails.specialAllowance || 0;
    otherAllowance = salaryDetails.otherFixedAllowance || 0;
  }

  const dailyRate = monthlyCTC > 0
    ? parseFloat((monthlyCTC / WORKING_DAYS_PER_MONTH).toFixed(2))
    : parseFloat((basicSalary / WORKING_DAYS_PER_MONTH).toFixed(2));

  // ── 5. Earnings computation ───────────────────────────────────────────────
  // Gross Wages = monthlyCTC (what the employee is entitled to for a full month)
  const grossWages = monthlyCTC || basicSalary;

  // Earned Wages = dailyRate × (fullDays + halfDays×0.5 + paidLeaves)
  const effectiveDays = fullDays + halfDays * 0.5 + paidLeaves;
  const earnedWages = parseFloat((dailyRate * effectiveDays).toFixed(2));

  // Overtime amount = totalOvertimeHours × (dailyRate / WORK_HOURS_PER_DAY) × multiplier
  const overtimeHourlyRate = dailyRate / WORK_HOURS_PER_DAY;
  const overtimeAmount = parseFloat(
    (totalOvertimeHours * overtimeHourlyRate * OVERTIME_HOURLY_MULTIPLIER).toFixed(2)
  );

  // Manual adjustments from payroll override record
  const extras = payrollOverride?.extras || 0;
  const otherWages = payrollOverride?.otherWages || 0;
  const penalties = payrollOverride?.penalties || 0;
  const loanAndAdvance = payrollOverride?.loanAndAdvance || 0;
  const otherDeductions = payrollOverride?.otherDeductions || 0;

  // Gross Earnings = earnedWages + overtimeAmount + extras + otherWages
  const grossEarnings = parseFloat(
    (earnedWages + overtimeAmount + extras + otherWages).toFixed(2)
  );

  // Take Home = grossEarnings − penalties − loanAndAdvance − otherDeductions
  const takeHome = parseFloat(
    (grossEarnings - penalties - loanAndAdvance - otherDeductions).toFixed(2)
  );

  return {
    fullDays,
    halfDays,
    offDays,
    paidLeaves,
    unpaidLeaves,
    dailyRate,
    grossWages,
    earnedWages,
    otherWages,
    overtimeAmount,
    extras,
    grossEarnings,
    penalties,
    loanAndAdvance,
    otherDeductions,
    takeHome,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// LIST PAYROLL  (paginated, filterable)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a paginated payroll listing for a given month/year.
 * Filters: departmentId, shiftId, search (name / employeeId)
 */
const getPayrollList = async (query, options) => {
  const month = parseInt(query.month, 10) || new Date().getMonth() + 1;
  const year = parseInt(query.year, 10) || new Date().getFullYear();
  const limit = parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : 10;
  const page = parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
  const skip = (page - 1) * limit;

  // ── Build user match stage ────────────────────────────────────────────────
  const userMatch = {
    role: { $ne: 'admin' },
    isActive: true,
  };

  if (query.search) {
    const regex = new RegExp(query.search, 'i');
    userMatch.$or = [{ name: regex }, { employeeId: regex }];
  }

  if (query.departmentId && mongoose.Types.ObjectId.isValid(query.departmentId)) {
    userMatch['workInformation.department'] = new mongoose.Types.ObjectId(query.departmentId);
  }

  if (query.shiftId && mongoose.Types.ObjectId.isValid(query.shiftId)) {
    userMatch['workInformation.shiftId'] = new mongoose.Types.ObjectId(query.shiftId);
  }

  // ── Fetch employees with their salary details ─────────────────────────────
  const totalResults = await User.countDocuments(userMatch);

  const employees = await User.find(userMatch)
    .select('name employeeId workInformation profilePic')
    .populate('workInformation.SalaryDetails')
    .sort({ name: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // ── Fetch all payroll override records for this month/year in one query ───
  const employeeIds = employees.map((e) => e._id);
  const payrollOverrides = await Payroll.find({
    employeeId: { $in: employeeIds },
    month,
    year,
  }).lean();

  const overrideMap = {};
  for (const ov of payrollOverrides) {
    overrideMap[String(ov.employeeId)] = ov;
  }

  // ── Compute payroll for each employee in parallel ─────────────────────────
  const results = await Promise.all(
    employees.map(async (emp) => {
      // Resolve department name
      let departmentName = null;
      const deptRef = emp.workInformation?.department;
      if (deptRef) {
        if (typeof deptRef === 'object' && deptRef.departmentName) {
          departmentName = deptRef.departmentName;
        } else if (mongoose.Types.ObjectId.isValid(String(deptRef))) {
          const dept = await mongoose.model('Department').findById(deptRef).select('departmentName').lean();
          departmentName = dept?.departmentName || null;
        }
      }

      const override = overrideMap[String(emp._id)] || null;
      const computed = await computePayrollForEmployee(emp, month, year, override);

      return {
        _id: emp._id,
        employeeId: emp.employeeId,
        name: emp.name,
        designation: emp.workInformation?.designation || null,
        department: departmentName,
        profilePic: emp.profilePic || null,
        payrollId: override?._id || null,
        status: override?.status || 'draft',
        ...computed,
      };
    })
  );

  return {
    results,
    page,
    limit,
    totalPages: Math.ceil(totalResults / limit),
    totalResults,
    month,
    year,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE EMPLOYEE PAYROLL PREVIEW
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detailed payroll breakdown for one employee for a given month/year.
 */
const getEmployeePayroll = async (employeeId, month, year) => {
  const emp = await User.findById(employeeId)
    .select('name employeeId workInformation profilePic')
    .populate('workInformation.SalaryDetails')
    .lean();

  if (!emp) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  }

  const override = await Payroll.findOne({ employeeId, month, year }).lean();
  const computed = await computePayrollForEmployee(emp, month, year, override);

  // Department name resolution
  let departmentName = null;
  const deptRef = emp.workInformation?.department;
  if (deptRef) {
    if (typeof deptRef === 'object' && deptRef.departmentName) {
      departmentName = deptRef.departmentName;
    } else if (mongoose.Types.ObjectId.isValid(String(deptRef))) {
      const dept = await mongoose.model('Department').findById(deptRef).select('departmentName').lean();
      departmentName = dept?.departmentName || null;
    }
  }

  return {
    _id: emp._id,
    employeeId: emp.employeeId,
    name: emp.name,
    designation: emp.workInformation?.designation || null,
    department: departmentName,
    profilePic: emp.profilePic || null,
    payrollId: override?._id || null,
    status: override?.status || 'draft',
    remarks: override?.remarks || null,
    month,
    year,
    ...computed,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE / UPDATE PAYROLL OVERRIDE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upsert a payroll override record for an employee month/year.
 * Allowed fields: extras, penalties, loanAndAdvance, otherDeductions, otherWages, status, remarks
 */
const upsertPayroll = async (employeeId, month, year, body) => {
  const emp = await User.findById(employeeId).lean();
  if (!emp) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  }

  const allowedFields = [
    'extras', 'penalties', 'loanAndAdvance', 'otherDeductions', 'otherWages',
    'totalSalary', 'overtimePayment', 'additionPayment', 'deductions', 'totalPayableAmount',
    'status', 'remarks'
  ];
  const update = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) update[field] = body[field];
  }

  const payroll = await Payroll.findOneAndUpdate(
    { employeeId, month, year },
    { $set: update },
    { new: true, upsert: true, runValidators: true }
  );

  return payroll;
};

// ─────────────────────────────────────────────────────────────────────────────
// PROCESS (LOCK) PAYROLL — saves computed snapshot
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute and lock payroll for an employee for the given month/year.
 * Saves the computed snapshot to the Payroll record and sets status → processed.
 */
const processPayroll = async (employeeId, month, year) => {
  const emp = await User.findById(employeeId)
    .select('name employeeId workInformation profilePic')
    .populate('workInformation.SalaryDetails')
    .lean();

  if (!emp) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  }

  const override = await Payroll.findOne({ employeeId, month, year }).lean();
  const computed = await computePayrollForEmployee(emp, month, year, override);

  const payroll = await Payroll.findOneAndUpdate(
    { employeeId, month, year },
    {
      $set: {
        status: 'processed',
        snapshot: {
          fullDays: computed.fullDays,
          halfDays: computed.halfDays,
          offDays: computed.offDays,
          paidLeaves: computed.paidLeaves,
          unpaidLeaves: computed.unpaidLeaves,
          dailyRate: computed.dailyRate,
          grossWages: computed.grossWages,
          earnedWages: computed.earnedWages,
          overtimeAmount: computed.overtimeAmount,
          grossEarnings: computed.grossEarnings,
          takeHome: computed.takeHome,
        },
      },
    },
    { new: true, upsert: true, runValidators: true }
  );

  return { ...computed, payrollId: payroll._id, status: payroll.status };
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────

const deletePayrollById = async (payrollId) => {
  const payroll = await Payroll.findById(payrollId);
  if (!payroll) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Payroll record not found');
  }
  await payroll.deleteOne();
  return payroll;
};

// ─────────────────────────────────────────────────────────────────────────────
// STOP PAYROLL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stop payroll for an employee. Creates/updates payroll record with stop details.
 * Sets status to 'stopped' and records all stop-related information.
 */
const stopPayroll = async (employeeId, stopData) => {
  const emp = await User.findById(employeeId).lean();
  if (!emp) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  }

  const { month, year, stopType, reason, effectiveFrom, resumeOn, impactMonth, stopRemarks } = stopData;

  // Validate required fields
  if (!stopType || !reason || !effectiveFrom || !impactMonth) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'stopType, reason, effectiveFrom, and impactMonth are required');
  }

  const stopDetails = {
    stopType,
    reason,
    effectiveFrom: new Date(effectiveFrom),
    impactMonth,
    stopRemarks: stopRemarks || '',
    stoppedAt: new Date(),
    resumedAt: null, // Initialize as null
  };

  // Add resumeOn if provided
  if (resumeOn) {
    stopDetails.resumeOn = new Date(resumeOn);
  }

  const payroll = await Payroll.findOneAndUpdate(
    { employeeId, month, year },
    {
      $set: {
        status: 'stopped',
        stopDetails,
      },
    },
    { new: true, upsert: true, runValidators: true }
  );

  return payroll;
};

// ─────────────────────────────────────────────────────────────────────────────
// RESUME PAYROLL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resume payroll for an employee. Updates payroll record to mark as resumed.
 * Sets status to 'resumed' and records resumption timestamp.
 */
const resumePayroll = async (employeeId, month, year, resumeRemarks = '') => {
  const payroll = await Payroll.findOne({ employeeId, month, year });

  if (!payroll) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Payroll record not found. Employee may not have stopped payroll.');
  }

  if (payroll.status !== 'stopped') {
    throw new ApiError(httpStatus.BAD_REQUEST, `Cannot resume payroll. Current status is '${payroll.status}', expected 'stopped'`);
  }

  // Update the payroll to resumed status
  payroll.status = 'resumed';
  payroll.stopDetails.resumedAt = new Date();

  // Add resume remarks if provided
  if (resumeRemarks) {
    payroll.remarks = payroll.remarks
      ? `${payroll.remarks}\n[RESUMED] ${resumeRemarks}`
      : `[RESUMED] ${resumeRemarks}`;
  }

  await payroll.save();
  return payroll;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET STOPPED PAYROLLS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all stopped payrolls with optional filters
 */
const createPayroll = async (payrollBody) => {
  // Check if employee exists
  const employee = await User.findById(payrollBody.employeeId);
  if (!employee) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  }

  // Check if payroll already exists for employee + month + year
  const existingPayroll = await Payroll.findOne({
    employeeId: payrollBody.employeeId,
    month: payrollBody.month,
    year: payrollBody.year,
  });
  if (existingPayroll) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Payroll already exists for this employee and period');
  }

  return Payroll.create(payrollBody);
};

const getStoppedPayrolls = async (query, options) => {
  const limit = parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : 10;
  const page = parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
  const skip = (page - 1) * limit;

  const filter = { status: 'stopped' };

  // Add date range filters if provided
  if (query.month) filter.month = parseInt(query.month, 10);
  if (query.year) filter.year = parseInt(query.year, 10);
  if (query.stopType) filter['stopDetails.stopType'] = query.stopType;
  if (query.reason) filter['stopDetails.reason'] = query.reason;

  const totalResults = await Payroll.countDocuments(filter);

  const results = await Payroll.find(filter)
    .populate('employeeId', 'name employeeId workInformation.designation profilePic')
    .sort({ 'stopDetails.stoppedAt': -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    results,
    page,
    limit,
    totalPages: Math.ceil(totalResults / limit),
    totalResults,
  };
};

module.exports = {
  getPayrollList,
  getEmployeePayroll,
  createPayroll,
  upsertPayroll,
  processPayroll,
  deletePayrollById,
  stopPayroll,
  resumePayroll,
  getStoppedPayrolls,
};
