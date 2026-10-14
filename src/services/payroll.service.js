const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { User, Attendance, LeaveRequests, LeaveBalance, Overtime, Payroll, PayrollPeriod, ContractorSettlement, Department } = require('../models');
const ApiError = require('../utils/ApiError');
const { calculateLeaveDays } = require('./leaveRequests.service');
const { detectOverlappingOvertime } = require('./overtimeOverlap.service');

// Working days per month used for daily-rate calculation (industry standard: 26)
const WORKING_DAYS_PER_MONTH = 26;

// Overtime rate multiplier (1.5x of daily rate per hour, assuming 8h day)
const OVERTIME_HOURLY_MULTIPLIER = 1.5;
const WORK_HOURS_PER_DAY = 8;
const snapshotText = (value, fields = []) => {
  if (value === null || value === undefined || value === '') return value ?? null;
  if (typeof value === 'object') {
    for (const field of fields) {
      if (value[field] !== undefined && value[field] !== null && value[field] !== '') return String(value[field]);
    }
    if (value._id !== undefined) return String(value._id);
  }
  return String(value);
};
const allowedTransitions = {
  draft: ['processed', 'stopped'],
  processed: ['processed', 'paid', 'stopped'],
  stopped: ['resumed'],
  resumed: ['processed', 'stopped'],
  paid: [],
};
const assertStatusTransition = (current, next) => {
  if (current === next) return;
  if (!allowedTransitions[current]?.includes(next)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Cannot change payroll status from '${current}' to '${next}'`);
  }
};

/**
 * Build the start and end Date objects for a given month/year (UTC).
 */
const getMonthRange = (month, year) => {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)); // last day of month
  return { start, end };
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
  const attendanceEmployeeIds = [employeeObjectId, String(employeeObjectId), employee.employeeId].filter(Boolean);

  // ── 1. Attendance counts ──────────────────────────────────────────────────
  const attendanceRecords = await Attendance.find({
    employeeId: { $in: attendanceEmployeeIds },
    date: { $gte: start, $lte: end },
  }).lean();

  let fullDays = 0;
  let halfDays = 0;
  let offDays = 0;
  let legacyAttendanceRecords = 0;
  const attendanceDateCounts = new Map();

  for (const rec of attendanceRecords) {
    const key = new Date(rec.date).toISOString().slice(0, 10);
    attendanceDateCounts.set(key, (attendanceDateCounts.get(key) || 0) + 1);
  }
  const duplicateAttendanceDates = [...attendanceDateCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([date, count]) => ({ date, count }));

  for (const rec of attendanceRecords) {
    const key = new Date(rec.date).toISOString().slice(0, 10);
    if (attendanceDateCounts.get(key) > 1) continue;
    if (!['fullDay', 'halfDay', 'absent'].includes(rec.attendanceCategory)) {
      legacyAttendanceRecords++;
      continue;
    }
    if (rec.attendanceCategory === 'fullDay') fullDays++;
    else if (rec.attendanceCategory === 'halfDay') halfDays++;
    else offDays++;
  }

  // ── 2. Leave counts ───────────────────────────────────────────────────────
  const leaveRecords = await LeaveRequests.find({
    employeeId: employeeObjectId,
    status: 'approved',
    $or: [
      { singleDate: { $gte: start, $lte: end } },
      { startDate: { $lte: end }, endDate: { $gte: start } },
    ],
  }).lean();

  let paidLeaves = 0;
  let unpaidLeaves = 0;
  let unclassifiedLeaves = 0;
  let unclassifiedLeaveDays = 0;

  for (const leave of leaveRecords) {
    const leaveStart = leave.singleDate || leave.startDate;
    const leaveEnd = leave.singleDate || leave.endDate || leave.startDate;
    if (!leaveStart || !leaveEnd) continue;
    const periodStart = new Date(Math.max(new Date(leaveStart).getTime(), start.getTime()));
    const periodEnd = new Date(Math.min(new Date(leaveEnd).getTime(), end.getTime()));
    if (periodStart > periodEnd) continue;
    const leaveDays = await calculateLeaveDays(employeeObjectId, periodStart, periodEnd, leave.leaveDuration || 'fullDay');
    if (!leaveDays) continue;

    const normalizedType = String(leave.leaveType || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const configuredBalance = await LeaveBalance.findOne({
      employeeId: employeeObjectId,
      leaveType: { $regex: `^${normalizedType}$`, $options: 'i' },
      year: year,
    }).lean();
    if (configuredBalance) {
      if (configuredBalance.isPaid) paidLeaves += leaveDays;
      else unpaidLeaves += leaveDays;
    } else if (String(leave.leaveType || '').trim().toLowerCase() === 'unpaid leave') {
      unpaidLeaves += leaveDays;
    } else {
      unclassifiedLeaves += 1;
      unclassifiedLeaveDays += leaveDays;
    }
  }

  // ── 3. Overtime ───────────────────────────────────────────────────────────
  const overtimeRecords = await Overtime.find({
    employeeId: employeeObjectId,
    status: 'approved',
    OvertimeDate: { $gte: start, $lte: end },
  }).lean();

  const overtimeDiagnostics = detectOverlappingOvertime(overtimeRecords);
  const totalOvertimeHours = overtimeRecords.reduce(
    (sum, rec) => overtimeDiagnostics.overlappingIds.has(String(rec._id)) ? sum : sum + (rec.totalDuration || 0), 0
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
  const configuredPfAmount = Number(salaryDetails?.pfAmount) || 0;
  const configuredEsiAmount = Number(salaryDetails?.esiAmount) || 0;
  const appliedPfAmount = payrollOverride ? (Number(payrollOverride.pfAmount) || 0) : configuredPfAmount;
  const appliedEsiAmount = payrollOverride ? (Number(payrollOverride.esiAmount) || 0) : configuredEsiAmount;

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
  const deductions = payrollOverride?.deductions || 0;

  // Gross Earnings = earnedWages + overtimeAmount + extras + otherWages
  const grossEarnings = parseFloat(
    (earnedWages + overtimeAmount + extras + otherWages).toFixed(2)
  );

  const totalDeductions = parseFloat((deductions + penalties + loanAndAdvance + otherDeductions + appliedPfAmount + appliedEsiAmount).toFixed(2));

  // Take Home = grossEarnings − all deductions, including PF and ESI once.
  const takeHome = parseFloat(
    (grossEarnings - totalDeductions).toFixed(2)
  );

  return {
    basicSalary,
    fullDays,
    halfDays,
    offDays,
    legacyAttendanceRecords,
    duplicateAttendanceDates,
    paidLeaves,
    unpaidLeaves,
    unclassifiedLeaves,
    unclassifiedLeaveDays,
    dailyRate,
    grossWages,
    earnedWages,
    otherWages,
    overtimeAmount,
    overtimeHours: totalOvertimeHours,
    overlappingOvertimeRecords: overtimeDiagnostics.groups,
    overlappingOvertimeDates: overtimeDiagnostics.overlappingDates,
    extras,
    grossEarnings,
    penalties,
    loanAndAdvance,
    otherDeductions,
    deductions,
    totalDeductions,
    takeHome,
    pfAmount: appliedPfAmount,
    esiAmount: appliedEsiAmount,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// LIST PAYROLL  (paginated, filterable)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a paginated payroll listing for a given month/year.
 * Filters: search (name / employeeId / email), departmentId, shiftId, branchId, status
 */
const getPayrollList = async (query, options) => {
  const month = parseInt(query.month, 10) || new Date().getMonth() + 1;
  const year  = parseInt(query.year,  10) || new Date().getFullYear();
  const limit = parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : 10;
  const page  = parseInt(options.page,  10) > 0 ? parseInt(options.page,  10) : 1;
  const skip  = (page - 1) * limit;

  if (query.role === 'contractor') return getContractorAbstractList(query, { page, limit });
  if (query.role === 'agent') return getAgentAbstractList(query, { page, limit });

  // ── Build user match stage ────────────────────────────────────────────────
  const userMatch = {
    role: { $in: ['employee', 'staff'] },
    isActive: 'Active',
  };

  // Free-text search across name, employeeId, email
  if (query.search) {
    const regex = new RegExp(query.search, 'i');
    userMatch.$or = [{ name: regex }, { employeeId: regex }, { email: regex }];
  }

  if (query.departmentId && mongoose.Types.ObjectId.isValid(query.departmentId)) {
    userMatch['workInformation.department'] = new mongoose.Types.ObjectId(query.departmentId);
  }

  if (query.shiftId && mongoose.Types.ObjectId.isValid(query.shiftId)) {
    userMatch['workInformation.shiftId'] = new mongoose.Types.ObjectId(query.shiftId);
  }

  if (query.branchId && mongoose.Types.ObjectId.isValid(query.branchId)) {
    userMatch['workInformation.branch'] = new mongoose.Types.ObjectId(query.branchId);
  }
  if (query.designation) {
    const designationMatch = { $or: [{ 'workInformation.designation': query.designation }] };
    if (mongoose.Types.ObjectId.isValid(query.designation)) designationMatch.$or.push({ 'workInformation.designationId': new mongoose.Types.ObjectId(query.designation) });
    userMatch.$and = userMatch.$and || [];
    if (userMatch.$or) { userMatch.$and.push({ $or: userMatch.$or }); delete userMatch.$or; }
    userMatch.$and.push(designationMatch);
  }
  if (query.role && ['employee', 'staff'].includes(query.role)) userMatch.role = query.role;

  // ── Fetch employees with their salary details ─────────────────────────────
  const totalResults = await User.countDocuments(userMatch);

  const employees = await User.find(userMatch)
    .select('name employeeId workInformation profilePic')
    .populate('workInformation.SalaryDetails')
    .sort({ name: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // ── Fetch payroll override records (filtered by status if provided) ───────
  const employeeIds = employees.map((e) => e._id);
  const payrollQuery = { employeeId: { $in: employeeIds }, month, year };
  if (query.status) payrollQuery.status = query.status;

  const payrollOverrides = await Payroll.find(payrollQuery).lean();

  const overrideMap = {};
  for (const ov of payrollOverrides) {
    overrideMap[String(ov.employeeId)] = ov;
  }

  // When status filter is active, only return employees that have a matching payroll record
  const filteredEmployees = query.status
    ? employees.filter((e) => overrideMap[String(e._id)])
    : employees;

  // ── Compute payroll for each employee in parallel ─────────────────────────
  const results = await Promise.all(
    filteredEmployees.map(async (emp) => {
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
      const pfAmount = override && override.pfAmount !== undefined ? override.pfAmount : 0;
      const esiAmount = override && override.esiAmount !== undefined ? override.esiAmount : 0;

      return {
        _id: emp._id,
        employeeId: emp.employeeId,
        name: emp.name,
        role: emp.role,
        designation: emp.workInformation?.designation || null,
        department: departmentName,
        profilePic: emp.profilePic || null,
        payrollId: override?._id || null,
        status: override?.status || 'draft',
        pfAmount,
        esiAmount,
        ...computed,
        pfAmount,
        esiAmount,
      };
    })
  );

  const payrollRows = await Payroll.find({
    employeeId: { $in: await User.find(userMatch).distinct('_id') },
    month,
    year,
    ...(query.status ? { status: query.status } : {}),
  }).select('pfAmount esiAmount').lean();
  const totalPfAmount = payrollRows.reduce((sum, row) => sum + (Number(row.pfAmount) || 0), 0);
  const totalEsiAmount = payrollRows.reduce((sum, row) => sum + (Number(row.esiAmount) || 0), 0);

  return {
    results,
    page,
    limit,
    totalPages: Math.ceil((query.status ? results.length : totalResults) / limit),
    totalResults: query.status ? results.length : totalResults,
    month,
    year,
    summary: { totalPfAmount, totalEsiAmount },
    totalPfAmount,
    totalEsiAmount,
  };
};

const paginateAbstractRows = (rows, page, limit) => ({
  results: rows.slice((page - 1) * limit, page * limit), page, limit,
  totalResults: rows.length, totalPages: Math.ceil(rows.length / limit),
});

const getContractorAbstractList = async (query, options) => {
  const filter = { month: Number(query.month) || new Date().getUTCMonth() + 1, year: Number(query.year) || new Date().getUTCFullYear() };
  if (query.status) filter.status = query.status;
  const settlements = await ContractorSettlement.find(filter).populate('contractorId', 'name employeeId role workInformation').sort({ createdAt: -1 }).lean();
  const search = String(query.search || '').toLowerCase();
  const rows = settlements.filter((row) => !search || `${row.contractorId?.name || ''} ${row.contractorId?.employeeId || ''}`.toLowerCase().includes(search)).map((row) => ({
    _id: row._id, settlementId: row._id, contractorId: row.contractorId?._id || row.contractorId,
    contractorName: row.contractorId?.name || null, employeeId: row.contractorId?.employeeId || null,
    role: 'contractor', month: row.month, year: row.year, workerCount: row.workerItems?.length || 0,
    earnedPay: row.totalShare, grossPay: row.totalShare, payableSalary: row.totalShare,
    additions: null, deductions: null, cashDisbursement: null, bankDisbursement: null, status: row.status,
  }));
  return paginateAbstractRows(rows, options.page, options.limit);
};

const getAgentAbstractList = async (query, options) => {
  const filter = { role: 'agent', isActive: 'Active', isDeleted: { $ne: true } };
  if (query.branchId && mongoose.Types.ObjectId.isValid(query.branchId)) filter['workInformation.branch'] = new mongoose.Types.ObjectId(query.branchId);
  const agents = await User.find(filter).populate('commissionDetails').sort({ name: 1 }).lean();
  const search = String(query.search || '').toLowerCase();
  const rows = agents.filter((agent) => !search || `${agent.name || ''} ${agent.agentId || ''}`.toLowerCase().includes(search)).map((agent) => ({
    _id: agent._id, agentId: agent.agentId || null, name: agent.name, role: 'agent',
    commission: agent.commissionDetails?.commission ?? null, allowance: agent.commissionDetails?.allowance ?? null,
    salaryDisbursementType: agent.commissionDetails?.salaryDisbursementType ?? null,
    payoutAvailable: false, totalSalary: null, payableSalary: null, cashDisbursement: null, bankDisbursement: null,
    totalShifts: null,
  }));
  return paginateAbstractRows(rows, options.page, options.limit);
};

const buildDepartmentLedger = async (month, year, employeeRows, staffRows) => {
  const finalized = await PayrollPeriod.exists({ month, year, status: 'finalized' });
  let rows = [...employeeRows.results, ...staffRows.results];
  if (finalized) {
    const snapshots = await Payroll.find({ month, year, status: { $in: ['processed', 'paid'] } }).select('snapshot').lean();
    rows = snapshots.map((row) => ({
      department: row.snapshot?.employee?.department || null,
      fullDays: row.snapshot?.fullDays || 0, overtimeHours: row.snapshot?.overtimeHours || 0,
      overtimeAmount: row.snapshot?.overtimeAmount || 0, grossEarnings: row.snapshot?.grossEarnings || 0,
      takeHome: row.snapshot?.takeHome || 0, deductions: 0,
    }));
  }
  const groups = new Map();
  for (const row of rows) {
    const name = row.department || 'Unassigned';
    const key = String(name);
    const group = groups.get(key) || { departmentId: mongoose.Types.ObjectId.isValid(key) ? key : null, departmentName: name, employeeCount: 0, basicPay: null, overtimeAmount: 0, overtimeHours: 0, additions: null, grossTotal: 0, deductions: 0, netPayable: 0, cashDisbursement: null, bankDisbursement: null };
    group.employeeCount += 1; group.overtimeAmount += Number(row.overtimeAmount) || 0; group.overtimeHours += Number(row.overtimeHours) || 0;
    group.grossTotal += Number(row.grossEarnings) || 0; group.deductions += Number(row.totalDeductions || row.deductions) || 0; group.netPayable += Number(row.takeHome) || 0;
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({ ...group, overtimeAmount: Number(group.overtimeAmount.toFixed(2)), grossTotal: Number(group.grossTotal.toFixed(2)), deductions: Number(group.deductions.toFixed(2)), netPayable: Number(group.netPayable.toFixed(2)) }));
};

const getPayrollAbstractSummary = async (query) => {
  const options = { page: 1, limit: 100 };
  const base = { month: query.month, year: query.year };
  const [employees, staff, contractors, agents] = await Promise.all([
    getPayrollList({ ...base, role: 'employee' }, options), getPayrollList({ ...base, role: 'staff' }, options),
    getContractorAbstractList(base, options), getAgentAbstractList(base, options),
  ]);
  const total = (rows, field) => rows.results.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
  const departmentLedger = await buildDepartmentLedger(Number(query.month), Number(query.year), employees, staff);
  return {
    month: Number(query.month), year: Number(query.year),
    totalSalary: total(employees, 'grossEarnings') + total(staff, 'grossEarnings') + total(contractors, 'grossPay'),
    payableSalary: total(employees, 'takeHome') + total(staff, 'takeHome') + total(contractors, 'payableSalary'),
    cashInHand: null, bankBalance: null, cashBankAvailable: false,
    employeeTypeMaster: { employees: employees.results, staff: staff.results, contractors: contractors.results },
    agentLedger: agents.results,
    departmentLedger,
    payrollSummary: { departmentCount: departmentLedger.length, employeeTypeCount: employees.totalResults + staff.totalResults, contractorCount: contractors.totalResults, agentCount: agents.totalResults, cashDisbursement: null, bankDisbursement: null, totalDisbursement: null },
  };
};

const getPayrollAbstractExport = async (query) => {
  const options = { page: 1, limit: 100 };
  if (query.type === 'summary') return getPayrollAbstractSummary(query);
  if (query.type === 'contractor') return getContractorAbstractList(query, options);
  if (query.type === 'agent') return getAgentAbstractList(query, options);
  return getPayrollList({ ...query, role: query.type }, options);
};

const calculatePeriodTotal = async (month, year) => {
  const first = await getPayrollList({ month, year }, { page: 1, limit: 100 });
  let rows = first.results;
  for (let page = 2; page <= first.totalPages; page += 1) {
    const next = await getPayrollList({ month, year }, { page, limit: 100 });
    rows = rows.concat(next.results);
  }
  return {
    payout: Number(rows.reduce((sum, row) => sum + (Number(row.takeHome) || 0), 0).toFixed(2)),
    payrollCount: first.totalResults,
  };
};

const calculateFinalizedBreakdown = async (month, year) => {
  const breakdown = {
    employees: { count: 0, amount: 0 },
    staff: { count: 0, amount: 0 },
    agents: { count: 0, amount: 0 },
    contractors: { count: 0, amount: 0 },
  };
  const payrolls = await Payroll.find({ month, year, status: { $in: ['processed', 'paid'] } })
    .select('employeeId snapshot.employee.role snapshot.takeHome')
    .lean();
  for (const payroll of payrolls) {
    const group = payroll.snapshot?.employee?.role === 'staff' ? breakdown.staff : breakdown.employees;
    group.count += 1;
    group.amount += Number(payroll.snapshot?.takeHome) || 0;
  }
  const settlements = await ContractorSettlement.find({ month, year, status: { $in: ['processed', 'paid'] } }).select('contractorId totalShare').lean();
  breakdown.contractors.count = settlements.length;
  breakdown.contractors.amount = Number(settlements.reduce((sum, settlement) => sum + (Number(settlement.totalShare) || 0), 0).toFixed(2));
  for (const key of ['employees', 'staff', 'agents', 'contractors']) breakdown[key].amount = Number(breakdown[key].amount.toFixed(2));
  return breakdown;
};

const periodResponse = (period) => ({
  month: period.month,
  year: period.year,
  status: period.status,
  finalizedAt: period.finalizedAt,
  finalizedBy: period.finalizedBy,
  totalPayout: period.totalPayout,
  netPayout: period.totalPayout,
  breakdown: period.breakdown || {
    employees: { count: 0, amount: 0 }, staff: { count: 0, amount: 0 },
    agents: { count: 0, amount: 0 }, contractors: { count: 0, amount: 0 },
  },
  abstractUrl: `/v1/payroll/periods/${period.year}/${period.month}/abstract`,
});

const getFinalizedPayrollPeriods = async (requestedYear, search = '') => {
  const query = { status: 'finalized' };
  if (requestedYear) query.year = Number(requestedYear);
  const normalizedSearch = String(search || '').trim().toLowerCase();
  const periods = await PayrollPeriod.find(query).sort({ year: -1, month: -1 }).lean();
  const filtered = normalizedSearch
    ? periods.filter((period) => new Date(Date.UTC(period.year, period.month - 1, 1)).toLocaleString('en-US', { month: 'long' }).toLowerCase().includes(normalizedSearch))
    : periods;
  return { data: filtered.map(periodResponse) };
};

const getPayrollAbstract = async (year, month) => {
  const period = await PayrollPeriod.findOne({ year, month, status: 'finalized' }).lean();
  if (!period) throw new ApiError(httpStatus.NOT_FOUND, 'Finalized payroll period not found');
  return periodResponse(period);
};

const getPayrollPeriods = async (requestedYear) => {
  const now = new Date();
  const year = Number(requestedYear) || now.getUTCFullYear();
  const currentMonth = now.getUTCFullYear() === year ? now.getUTCMonth() + 1 : null;
  const [periods, payrollMonths] = await Promise.all([
    PayrollPeriod.find({ year }).sort({ month: -1 }).lean(),
    Payroll.distinct('month', { year }),
  ]);
  const months = new Set(payrollMonths.map(Number));
  periods.forEach((period) => months.add(period.month));
  if (currentMonth) months.add(currentMonth);

  const finalizedByMonth = new Map(periods.map((period) => [period.month, period]));
  const data = [];
  for (const month of [...months].sort((a, b) => b - a)) {
    const finalized = finalizedByMonth.get(month);
    if (finalized) {
      data.push({
        month, year, status: 'finalized', payout: finalized.totalPayout, payoutType: 'final',
        payrollCount: finalized.payrollCount, finalizedAt: finalized.finalizedAt, finalizedBy: finalized.finalizedBy,
      });
      continue;
    }
    const totals = await calculatePeriodTotal(month, year);
    const live = month === currentMonth;
    data.push({ month, year, status: live ? 'live' : 'pendingFinalization', payout: totals.payout, payoutType: live ? 'estimated' : 'draft', payrollCount: totals.payrollCount });
  }
  return { data };
};

const finalizePayrollPeriod = async (year, month, actorId) => {
  const now = new Date();
  const requested = new Date(Date.UTC(year, month - 1, 1));
  const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  if (requested > current) throw new ApiError(httpStatus.BAD_REQUEST, 'Future payroll months cannot be finalized');
  const existing = await PayrollPeriod.findOne({ year, month }).lean();
  if (existing) return existing;

  // Finalization must materialize the same individual frozen payroll records
  // used by payslips before creating the month aggregate.
  const eligibleUsers = await User.find({ role: { $in: ['employee', 'staff'] }, isActive: 'Active', isDeleted: { $ne: true } })
    .select('_id')
    .lean();
  for (const user of eligibleUsers) {
    const existingPayroll = await Payroll.findOne({ employeeId: user._id, month, year }).select('status').lean();
    if (existingPayroll?.status === 'paid') continue;
    await processPayroll(user._id, month, year, actorId);
  }

  const breakdown = await calculateFinalizedBreakdown(month, year);
  const totals = {
    payout: Number(Object.values(breakdown).reduce((sum, group) => sum + group.amount, 0).toFixed(2)),
    payrollCount: breakdown.employees.count + breakdown.staff.count,
  };
  try {
    return await PayrollPeriod.create({ month, year, status: 'finalized', totalPayout: totals.payout, payrollCount: totals.payrollCount, breakdown, finalizedAt: new Date(), finalizedBy: actorId });
  } catch (error) {
    if (error.code === 11000) return PayrollPeriod.findOne({ year, month });
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE EMPLOYEE PAYROLL PREVIEW
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detailed payroll breakdown for one employee for a given month/year.
 */
const getEmployeePayroll = async (employeeId, month, year) => {
  const emp = await User.findById(employeeId)
    .select('name employeeId role workInformation profilePic isDeleted')
    .populate('workInformation.SalaryDetails')
    .lean();

  if (!emp) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  }

  const override = await Payroll.findOne({ employeeId, month, year }).lean();
  const computed = await computePayrollForEmployee(emp, month, year, override);
  const pfAmount = override && override.pfAmount !== undefined ? override.pfAmount : 0;
  const esiAmount = override && override.esiAmount !== undefined ? override.esiAmount : 0;

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
    pfAmount,
    esiAmount,
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
  if (!emp || emp.isDeleted === true) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  }
  if (!['employee', 'staff'].includes(emp.role)) throw new ApiError(httpStatus.BAD_REQUEST, 'Payroll is only available for employee and staff users');

  const allowedFields = [
    'extras', 'penalties', 'loanAndAdvance', 'otherDeductions', 'otherWages',
    'totalSalary', 'overtimePayment', 'additionPayment', 'deductions', 'totalPayableAmount', 'pfAmount', 'esiAmount',
    'status', 'remarks'
  ];
  const update = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) update[field] = body[field];
  }

  const existing = await Payroll.findOne({ employeeId, month, year });
  if (existing?.status === 'paid') throw new ApiError(httpStatus.CONFLICT, 'Paid payroll is immutable');
  if (existing && body.status) assertStatusTransition(existing.status, body.status);
  if (existing) {
    if (body.status === 'paid') { update.paidAt = new Date(); update.paidBy = body.updatedBy; }
    update.updatedBy = body.updatedBy;
  }
  const payroll = await Payroll.findOneAndUpdate({ employeeId, month, year }, { $set: update }, { new: true, upsert: true, runValidators: true });

  return payroll;
};

// ─────────────────────────────────────────────────────────────────────────────
// PROCESS (LOCK) PAYROLL — saves computed snapshot
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute and lock payroll for an employee for the given month/year.
 * Saves the computed snapshot to the Payroll record and sets status → processed.
 */
const processPayroll = async (employeeId, month, year, actorId) => {
  const emp = await User.findById(employeeId)
    .select('name employeeId role workInformation profilePic isDeleted')
    .populate('workInformation.SalaryDetails')
    .lean();

  if (!emp || emp.isDeleted === true) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  }

  const override = await Payroll.findOne({ employeeId, month, year }).lean();
  if (override?.status === 'paid') throw new ApiError(httpStatus.CONFLICT, 'Paid payroll cannot be reprocessed');
  const computed = await computePayrollForEmployee(emp, month, year, override);

  const payroll = await Payroll.findOneAndUpdate(
    { employeeId, month, year },
    {
      $set: {
        status: 'processed',
        processedBy: actorId,
        processedAt: new Date(),
        updatedBy: actorId,
        pfAmount: computed.pfAmount,
        esiAmount: computed.esiAmount,
        snapshot: {
          employee: {
            id: emp._id,
            employeeCode: emp.employeeId,
            name: emp.name,
            role: emp.role,
            designation: emp.workInformation?.designation,
            department: snapshotText(emp.workInformation?.department, ['departmentName', 'name']),
            branch: snapshotText(emp.workInformation?.branch, ['branchName', 'name']),
          },
          fullDays: computed.fullDays,
          halfDays: computed.halfDays,
          offDays: computed.offDays,
          paidLeaves: computed.paidLeaves,
          unpaidLeaves: computed.unpaidLeaves,
          dailyRate: computed.dailyRate,
          grossWages: computed.grossWages,
          earnedWages: computed.earnedWages,
          overtimeAmount: computed.overtimeAmount,
          overtimeHours: computed.overtimeHours,
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
  if (payroll.status !== 'draft') throw new ApiError(httpStatus.CONFLICT, 'Only draft payroll can be deleted');
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
  if (!emp || emp.isDeleted === true) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  }

  const { month, year, stopType, reason, effectiveFrom, resumeOn, impactMonth, stopRemarks } = stopData;
  const existing = await Payroll.findOne({ employeeId, month, year });
  if (existing?.status === 'paid') throw new ApiError(httpStatus.CONFLICT, 'Paid payroll cannot be stopped');

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
  if (payroll.status === 'paid') throw new ApiError(httpStatus.CONFLICT, 'Paid payroll cannot be resumed');

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
const createPayroll = async (payrollBody, actorId) => {
  // Check if employee exists
  const employee = await User.findById(payrollBody.employeeId);
  if (!employee || employee.isDeleted === true) {
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

  const body = { ...payrollBody };
  if (body.status === 'paid') { body.paidAt = new Date(); body.paidBy = actorId; }
  return Payroll.create(body);
};

const updatePayrollStatus = async (payrollId, status, actorId) => {
  const payroll = await Payroll.findById(payrollId);
  if (!payroll) throw new ApiError(httpStatus.NOT_FOUND, 'Payroll record not found');
  assertStatusTransition(payroll.status, status);
  if (payroll.status === 'paid') throw new ApiError(httpStatus.CONFLICT, 'Paid payroll is immutable');
  payroll.status = status;
  payroll.updatedBy = actorId;
  if (status === 'paid') { payroll.paidAt = new Date(); payroll.paidBy = actorId; }
  await payroll.save();
  return payroll;
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

const getStopPayrollList = async (query = {}, options = {}) => {
  const page = Math.max(Number(options.page) || 1, 1); const limit = Math.min(Math.max(Number(options.limit) || 10, 1), 100);
  const filter = { status: query.status || { $in: ['stopped', 'resumed', 'processed', 'paid'] } };
  if (query.month) filter.month = Number(query.month); if (query.year) filter.year = Number(query.year);
  const payrolls = await Payroll.find(filter).populate('employeeId', 'name employeeId role profilePic workInformation').sort({ updatedAt: -1 }).lean();
  const search = String(query.search || '').toLowerCase();
  const rows = payrolls.filter((payroll) => {
    const employee = payroll.employeeId || {}; const snapshot = payroll.snapshot?.employee || {};
    if (!['employee', 'staff'].includes(employee.role || snapshot.role)) return false;
    if (query.role && (employee.role || snapshot.role) !== query.role) return false;
    if (query.departmentId) {
      const department = snapshot.department || employee.workInformation?.department;
      if (String(department) !== String(query.departmentId)) return false;
    }
    return !search || `${employee.name || snapshot.name || ''} ${employee.employeeId || snapshot.employeeCode || ''}`.toLowerCase().includes(search);
  }).map((payroll) => {
    const employee = payroll.employeeId || {}; const snapshot = payroll.snapshot?.employee || {}; const released = ['resumed', 'processed', 'paid'].includes(payroll.status) && payroll.stopDetails?.resumedAt;
    return {
      payrollId: payroll._id, employeeId: employee._id || payroll.employeeId, employeeCode: employee.employeeId || snapshot.employeeCode,
      name: employee.name || snapshot.name, profilePic: employee.profilePic || null, role: employee.role || snapshot.role,
      department: snapshot.department || employee.workInformation?.department || null, shift: null,
      reason: payroll.stopDetails?.reason || null, stopType: payroll.stopDetails?.stopType || null,
      from: payroll.stopDetails?.effectiveFrom || payroll.stopDetails?.stoppedAt || null,
      till: released ? payroll.stopDetails.resumedAt : (payroll.stopDetails?.resumeOn || null),
      amount: Number(payroll.snapshot?.takeHome ?? payroll.totalPayableAmount ?? 0), status: payroll.status,
      stoppedAt: payroll.stopDetails?.stoppedAt || null, resumedAt: payroll.stopDetails?.resumedAt || null, resumeOn: payroll.stopDetails?.resumeOn || null,
    };
  });
  return { results: rows.slice((page - 1) * limit, page * limit), page, limit, totalResults: rows.length, totalPages: Math.ceil(rows.length / limit) };
};

const getStopPayrollQuickStats = async (query = {}) => {
  const filter = {}; if (query.month) filter.month = Number(query.month); if (query.year) filter.year = Number(query.year);
  const rows = await Payroll.find(filter).select('status stopDetails snapshot.takeHome totalPayableAmount employeeId').populate('employeeId', 'role').lean();
  const relevant = rows.filter((row) => ['employee', 'staff'].includes(row.employeeId?.role));
  const stopped = relevant.filter((row) => row.status === 'stopped');
  const released = relevant.filter((row) => ['resumed', 'processed', 'paid'].includes(row.status) && row.stopDetails?.resumedAt);
  const amount = (row) => Number(row.snapshot?.takeHome ?? row.totalPayableAmount ?? 0);
  return { stoppedPayrolls: stopped.length, releasedPayrolls: released.length, pendingAmount: stopped.reduce((sum, row) => sum + amount(row), 0), releasedAmount: released.reduce((sum, row) => sum + amount(row), 0) };
};

const getStopPayrollDashboard = async (query = {}, options = {}) => ({
  quickStats: await getStopPayrollQuickStats(query),
  list: await getStopPayrollList(query, options),
});

const getPayrollHistoryForUser = async (employeeId, query = {}, options = {}) => {
  const limit = Math.min(parseInt(options.limit, 10) || 10, 100);
  const page = Math.max(parseInt(options.page, 10) || 1, 1);
  const filter = { employeeId };
  if (query.month) filter.month = Number(query.month);
  if (query.year) filter.year = Number(query.year);
  if (query.status) filter.status = query.status;
  const totalResults = await Payroll.countDocuments(filter);
  const sort = {};
  String(options.sortBy || '-year,-month').split(',').forEach((item) => {
    const [field, direction] = item.replace(/^-/, '').split(':');
    if (['month', 'year', 'status', 'createdAt', 'updatedAt'].includes(field)) sort[field] = item.startsWith('-') || direction === 'desc' ? -1 : 1;
  });
  if (!Object.keys(sort).length) Object.assign(sort, { year: -1, month: -1 });
  const results = await Payroll.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean();
  return { results, page, limit, totalPages: Math.ceil(totalResults / limit), totalResults };
};

const getPayrollForUser = async (employeeId, payrollId) => {
  const payroll = await Payroll.findOne({ _id: payrollId, employeeId }).lean();
  if (!payroll) throw new ApiError(httpStatus.NOT_FOUND, 'Payroll record not found');
  return payroll;
};

const getPayslip = async (payrollId, employeeId = null) => {
  const payroll = await Payroll.findById(payrollId).lean();
  if (!payroll) throw new ApiError(httpStatus.NOT_FOUND, 'Payroll record not found');
  if (employeeId && String(payroll.employeeId) !== String(employeeId)) throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  if (!['processed', 'paid'].includes(payroll.status) && !(payroll.status === 'stopped' && payroll.processedAt && payroll.snapshot)) {
    throw new ApiError(httpStatus.CONFLICT, 'Payslip is available only for processed or paid payroll');
  }
  const snapshot = payroll.snapshot || {};
  const employee = snapshot.employee || {};
  let department = employee.department || null;
  if (department && mongoose.Types.ObjectId.isValid(String(department))) {
    const departmentRecord = await Department.findById(department).select('departmentName').lean();
    department = departmentRecord?.departmentName || department;
  }
  const pfAmount = payroll.pfAmount || 0;
  const esiAmount = payroll.esiAmount || 0;
  return {
    payslip: {
      payrollId: payroll._id,
      month: payroll.month,
      year: payroll.year,
      status: payroll.status,
      processedAt: payroll.processedAt || null,
      paidAt: payroll.paidAt || null,
      employee: { id: employee.id || payroll.employeeId, employeeCode: employee.employeeCode, name: employee.name, role: employee.role, designation: employee.designation, department, branch: employee.branch },
      attendance: { fullDays: snapshot.fullDays || 0, halfDays: snapshot.halfDays || 0, absentDays: snapshot.absentDays || 0, paidLeaves: snapshot.paidLeaves || 0, unpaidLeaves: snapshot.unpaidLeaves || 0, overtimeHours: snapshot.overtimeHours || 0 },
      earnings: { grossWages: snapshot.grossWages || 0, earnedWages: snapshot.earnedWages || 0, overtimeAmount: snapshot.overtimeAmount || 0, extras: payroll.extras || 0, otherWages: payroll.otherWages || 0, grossEarnings: snapshot.grossEarnings || 0 },
      deductions: { deductions: payroll.deductions || 0, penalties: payroll.penalties || 0, loanAndAdvance: payroll.loanAndAdvance || 0, otherDeductions: payroll.otherDeductions || 0, pfAmount, esiAmount, totalDeductions: Math.max(0, (snapshot.grossEarnings || 0) - (snapshot.takeHome || 0)) },
      takeHome: snapshot.takeHome || 0,
    },
  };
};

const getPayslipOptions = async ({ year, month, category = 'all', search = '' }) => {
  const filter = { year: Number(year), month: Number(month), status: { $in: ['processed', 'paid'] } };
  const rows = await Payroll.find(filter).select('_id employeeId snapshot.employee').lean();
  const normalizedSearch = String(search || '').trim().toLowerCase();
  const data = rows
    .map((row) => {
      const employee = row.snapshot?.employee || {};
      return {
        payrollId: row._id,
        employeeId: employee.employeeCode || row.employeeId,
        name: employee.name || null,
        role: employee.role || null,
      };
    })
    .filter((row) => (category === 'all' || row.role === category)
      && (!normalizedSearch
        || String(row.name || '').toLowerCase().includes(normalizedSearch)
        || String(row.employeeId || '').toLowerCase().includes(normalizedSearch)))
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  return { data };
};

module.exports = {
  computePayrollForEmployee,
  getPayrollList,
  getPayrollPeriods,
  getPayrollAbstractSummary,
  getPayrollAbstractExport,
  finalizePayrollPeriod,
  getFinalizedPayrollPeriods,
  getPayrollAbstract,
  getEmployeePayroll,
  createPayroll,
  upsertPayroll,
  processPayroll,
  deletePayrollById,
  stopPayroll,
  resumePayroll,
  getStoppedPayrolls,
  getStopPayrollList,
  getStopPayrollQuickStats,
  getStopPayrollDashboard,
  getPayrollHistoryForUser,
  getPayrollForUser,
  getPayslip,
  getPayslipOptions,
  updatePayrollStatus,
  assertStatusTransition,
};
