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
 * Query for attendances
 */
const queryAttendances = async (filter, options) => {
  const result = await Attendance.paginate(filter, options);
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
