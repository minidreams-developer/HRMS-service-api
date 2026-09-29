const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { ShiftAssignment, Shift, User } = require('../models');
const ApiError = require('../utils/ApiError');

const day = (value) => { const d = new Date(value); if (Number.isNaN(d.getTime())) throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid effective date'); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); };
const endOf = (value) => value ? new Date(day(value).getTime() + 86399999) : null;
const overlaps = (aStart, aEnd, bStart, bEnd) => aStart <= bEnd && (!aEnd || aEnd >= bStart);

const assignShift = async (body, actor) => {
  const employee = await User.findById(body.employeeId).lean();
  if (!employee) throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  if (employee.isDeleted === true) throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  if (employee.isActive !== 'Active') throw new ApiError(httpStatus.BAD_REQUEST, 'Inactive or relieved users cannot receive a new ShiftAssignment');
  const shift = await Shift.findById(body.shiftId).lean();
  if (!shift) throw new ApiError(httpStatus.NOT_FOUND, 'Shift not found');
  if (!shift.isShiftActive) throw new ApiError(httpStatus.BAD_REQUEST, 'Inactive Shift cannot be assigned');
  const from = day(body.effectiveFrom); const to = body.effectiveTo ? endOf(body.effectiveTo) : null;
  if (to && to < from) throw new ApiError(httpStatus.BAD_REQUEST, 'effectiveTo must be on or after effectiveFrom');
  if (from > day(new Date())) throw new ApiError(httpStatus.BAD_REQUEST, 'Future-dated assignments are not supported yet');
  const existing = await ShiftAssignment.find({ employeeId: body.employeeId }).sort({ effectiveFrom: 1 });
  if (existing.some((item) => overlaps(from, to, item.effectiveFrom, item.effectiveTo))) throw new ApiError(httpStatus.CONFLICT, 'Shift assignment period overlaps an existing assignment');
  const current = existing.find((item) => item.isCurrent);
  if (current && !current.effectiveTo) { current.effectiveTo = new Date(from.getTime() - 1); current.isCurrent = false; await current.save(); }
  const assignment = await ShiftAssignment.create({ employeeId: body.employeeId, shiftId: body.shiftId, effectiveFrom: from, effectiveTo: to, isCurrent: true, assignedBy: actor._id, reason: body.reason });
  await User.updateOne({ _id: body.employeeId }, { $set: { 'workInformation.shiftId': shift._id } });
  return getAssignmentById(assignment._id);
};

const present = (item) => item && ({ ...item, id: item._id, employeeId: item.employeeId, shift: item.shiftId, shiftId: item.shiftId, assignedBy: item.assignedBy });
const getAssignmentById = async (id) => present(await ShiftAssignment.findById(id).populate('shiftId', 'shiftName shiftCode shiftType isShiftActive').populate('assignedBy', 'name employeeId').lean());
const getEmployeeAssignments = async (employeeId, options = {}) => {
  const limit = Math.max(1, Number(options.limit) || 10); const page = Math.max(1, Number(options.page) || 1);
  const filter = { employeeId }; if (options.fromDate) filter.effectiveFrom = { $gte: day(options.fromDate) };
  const [results, totalResults] = await Promise.all([ShiftAssignment.find(filter).populate('shiftId', 'shiftName shiftCode shiftType isShiftActive').populate('assignedBy', 'name employeeId').sort({ effectiveFrom: -1 }).skip((page - 1) * limit).limit(limit).lean(), ShiftAssignment.countDocuments(filter)]);
  return { results: results.map(present), page, limit, totalPages: Math.ceil(totalResults / limit), totalResults };
};

const getEmployeeShiftForDate = async (employeeId, date) => {
  const target = day(date);
  let normalizedEmployeeId;
  try { normalizedEmployeeId = new mongoose.Types.ObjectId(String(employeeId)); } catch (error) { return null; }
  const assignment = await ShiftAssignment.findOne({
    employeeId: normalizedEmployeeId,
    effectiveFrom: { $lte: target },
    $or: [
      { effectiveTo: null },
      { effectiveTo: { $exists: false } },
      { effectiveTo: { $gte: target } },
    ],
  }).sort({ effectiveFrom: -1, _id: -1 }).lean();
  if (assignment) {
    const shift = await Shift.findById(assignment.shiftId).lean();
    if (shift) return shift;
  }
  const employee = await User.findById(normalizedEmployeeId).lean();
  const legacyShiftId = employee?.workInformation?.shiftId;
  return legacyShiftId ? Shift.findById(legacyShiftId).lean() : null;
};

module.exports = { assignShift, getAssignmentById, getEmployeeAssignments, getEmployeeShiftForDate };
