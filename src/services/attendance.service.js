const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { Attendance } = require('../models');
const ApiError = require('../utils/ApiError');

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

/**
 * Create an attendance record
 */
const createAttendance = async (body) => {
  return Attendance.create(body);
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
  const { User } = require('../models');
  const mongoFilter = {};

  // Search — resolve user IDs first, then scope attendance records
  if (filter.search) {
    const regex = { $regex: filter.search, $options: 'i' };
    const matchedUsers = await User.find(
      { $or: [{ name: regex }, { email: regex }, { employeeId: regex }] },
      { _id: 1 }
    ).lean();
    const userIds = matchedUsers.map((u) => u._id);
    mongoFilter.employeeId = { $in: userIds };
  }

  // Direct employeeId filter (overrides search scope if both given)
  if (filter.employeeId && isObjectId(filter.employeeId)) {
    mongoFilter.employeeId = new mongoose.Types.ObjectId(filter.employeeId);
  }

  // Shift filter
  if (filter.shiftId && isObjectId(filter.shiftId)) {
    mongoFilter.shiftId = new mongoose.Types.ObjectId(filter.shiftId);
  }

  // Attendance status filter
  if (filter.attendanceStatus) {
    mongoFilter.attendanceStatus = filter.attendanceStatus;
  }

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
const updateAttendanceById = async (id, updateBody) => {
  const attendance = await Attendance.findById(id);
  if (!attendance) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Attendance not found');
  }
  Object.assign(attendance, updateBody);
  await attendance.save();
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

module.exports = {
  createAttendance,
  queryAttendances,
  getAttendanceById,
  updateAttendanceById,
  deleteAttendanceById,
};
