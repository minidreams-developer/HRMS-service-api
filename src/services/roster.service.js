const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { Roster, User, Shift, Department } = require('../models');
const ApiError = require('../utils/ApiError');
const { getEmployeeShiftForDate } = require('./shiftAssignment.service');

const day = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid date');
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};
const end = (value) => new Date(day(value).getTime() + 86399999);
const oid = (value) => new mongoose.Types.ObjectId(String(value));
const managementRoles = new Set(['manager', 'hr_manager', 'subAdmin', 'admin']);
const listValues = (value) => (value == null || value === '' ? [] : (Array.isArray(value) ? value : String(value).split(',')).map(String).map((v) => v.trim()).filter(Boolean));

const ensureManagement = (actor) => {
  if (!managementRoles.has(actor.role)) throw new ApiError(httpStatus.FORBIDDEN, 'Only management may manage rosters');
};
const ensureDate = (value, allowPast = false) => {
  const date = day(value);
  if (!allowPast && date < day(new Date())) throw new ApiError(httpStatus.BAD_REQUEST, 'Historical roster assignments are not allowed');
  return date;
};
const getEligibleUser = async (employeeId, allowDeleted = false) => {
  const user = await User.findById(employeeId).lean();
  if (!user || (!allowDeleted && user.isDeleted === true)) throw new ApiError(httpStatus.NOT_FOUND, 'Employee or staff member not found');
  if (!['employee', 'staff'].includes(user.role)) throw new ApiError(httpStatus.BAD_REQUEST, 'Roster target must be an employee or staff member');
  if (!allowDeleted && user.isActive !== 'Active') throw new ApiError(httpStatus.BAD_REQUEST, 'Inactive or relieved users cannot be assigned to a new roster');
  return user;
};
const getActiveShift = async (shiftId) => {
  const shift = await Shift.findById(shiftId).lean();
  if (!shift) throw new ApiError(httpStatus.NOT_FOUND, 'Shift not found');
  if (shift.isShiftActive === false) throw new ApiError(httpStatus.BAD_REQUEST, 'Inactive Shift cannot be assigned to a roster');
  return shift;
};
const populateRoster = (query) => query
  .populate('employeeId', 'name employeeId role isActive isDeleted workInformation.designation workInformation.department')
  .populate('shiftId', 'shiftName shiftCode shiftType timings weekOff isShiftActive')
  .populate('createdBy', 'name employeeId')
  .populate('updatedBy', 'name employeeId')
  .populate('cancelledBy', 'name employeeId');

const createRoster = async (body, actor) => {
  ensureManagement(actor);
  const date = ensureDate(body.date);
  await getEligibleUser(body.employeeId);
  await getActiveShift(body.shiftId);
  if (await Roster.exists({ employeeId: body.employeeId, date, status: 'scheduled' })) throw new ApiError(httpStatus.CONFLICT, 'Active roster already exists for this employee and date');
  const record = await Roster.create({ ...body, date, status: 'scheduled', createdBy: actor._id });
  return populateRoster(Roster.findById(record._id));
};

const updateRoster = async (id, body, actor) => {
  ensureManagement(actor);
  const record = await Roster.findById(id);
  if (!record) throw new ApiError(httpStatus.NOT_FOUND, 'Roster not found');
  if (record.status !== 'scheduled') throw new ApiError(httpStatus.BAD_REQUEST, 'Cancelled roster cannot be updated');
  if (record.date < day(new Date())) throw new ApiError(httpStatus.BAD_REQUEST, 'Historical roster cannot be updated');
  if (body.shiftId) await getActiveShift(body.shiftId);
  if (body.shiftId && await Roster.exists({ _id: { $ne: id }, employeeId: record.employeeId, date: record.date, status: 'scheduled' })) throw new ApiError(httpStatus.CONFLICT, 'Active roster already exists for this employee and date');
  if (body.shiftId !== undefined) record.shiftId = body.shiftId;
  if (body.notes !== undefined) record.notes = body.notes;
  record.updatedBy = actor._id;
  await record.save();
  return populateRoster(Roster.findById(id));
};

const cancelRoster = async (id, actor) => {
  ensureManagement(actor);
  const record = await Roster.findById(id);
  if (!record) throw new ApiError(httpStatus.NOT_FOUND, 'Roster not found');
  if (record.status === 'cancelled') return record;
  if (record.date < day(new Date())) throw new ApiError(httpStatus.BAD_REQUEST, 'Historical roster cannot be cancelled');
  record.status = 'cancelled'; record.cancelledBy = actor._id; record.cancelledAt = new Date(); record.updatedBy = actor._id;
  await record.save();
  return record;
};

const createBulk = async (body, actor) => {
  ensureManagement(actor);
  if (!Array.isArray(body.employeeIds) || !body.employeeIds.length) throw new ApiError(httpStatus.BAD_REQUEST, 'employeeIds must not be empty');
  const from = ensureDate(body.fromDate); const to = ensureDate(body.toDate);
  if (to < from) throw new ApiError(httpStatus.BAD_REQUEST, 'toDate must be on or after fromDate');
  await getActiveShift(body.shiftId);
  const dates = [];
  for (let cursor = from; cursor <= to; cursor = new Date(cursor.getTime() + 86400000)) dates.push(new Date(cursor));
  const users = await Promise.all(body.employeeIds.map((id) => getEligibleUser(id)));
  const employeeIds = users.map((user) => user._id);
  const conflicts = [];
  for (const employeeId of employeeIds) for (const date of dates) {
    const existing = await Roster.findOne({ employeeId, date, status: 'scheduled' }).select('_id').lean();
    if (existing) conflicts.push({ employeeId, date, rosterId: existing._id });
  }
  if (conflicts.length) throw Object.assign(new ApiError(httpStatus.CONFLICT, 'One or more roster assignments already exist'), { conflicts });
  const docs = employeeIds.flatMap((employeeId) => dates.map((date) => ({ employeeId, date, shiftId: body.shiftId, notes: body.notes, status: 'scheduled', createdBy: actor._id })));
  const records = await Roster.insertMany(docs, { ordered: true });
  return { createdCount: records.length, records };
};

const queryRoster = async (filter, options = {}) => {
  const query = {};
  if (filter.status) query.status = filter.status; else query.status = 'scheduled';
  if (filter.date) query.date = day(filter.date);
  else if (filter.fromDate || filter.toDate) query.date = { ...(filter.fromDate ? { $gte: day(filter.fromDate) } : {}), ...(filter.toDate ? { $lte: end(filter.toDate) } : {}) };
  const employeeIds = listValues(filter.employeeIds || filter.employeeId);
  if (employeeIds.length) query.employeeId = { $in: employeeIds.map(oid) };
  const shiftIds = listValues(filter.shiftIds || filter.shiftId);
  if (shiftIds.length) query.shiftId = { $in: shiftIds.map(oid) };
  if (filter.role || filter.departmentId || filter.search) {
    const userQuery = { isDeleted: { $ne: true } };
    if (filter.role) userQuery.role = filter.role;
    const departmentIds = listValues(filter.departmentIds || filter.departmentId);
    if (departmentIds.length) userQuery['workInformation.department'] = { $in: departmentIds.map(oid) };
    if (filter.search) userQuery.$or = [{ name: { $regex: filter.search, $options: 'i' } }, { employeeId: { $regex: filter.search, $options: 'i' } }];
    query.employeeId = { $in: (await User.find(userQuery).select('_id').lean()).map((user) => user._id) };
  }
  const result = await Roster.paginate(query, { ...options, populate: 'employeeId,shiftId,createdBy,updatedBy,cancelledBy' });

  // Include the current active workforce count for every shift returned by
  // the roster. This is based on the employee/staff shift assignment, not on
  // the number of roster rows in the current page.
  const returnedShiftIds = [...new Set(result.results
    .map((roster) => roster.shiftId?._id || roster.shiftId)
    .filter(Boolean)
    .map((shiftId) => String(shiftId)))].map((shiftId) => oid(shiftId));
  if (returnedShiftIds.length) {
    const activeUsersByShift = await User.aggregate([
      {
        $match: {
          role: { $in: ['employee', 'staff'] },
          isActive: 'Active',
          isDeleted: { $ne: true },
          'workInformation.shiftId': { $in: returnedShiftIds },
        },
      },
      { $group: { _id: '$workInformation.shiftId', total: { $sum: 1 } } },
    ]);
    const counts = new Map(activeUsersByShift.map((item) => [String(item._id), item.total]));
    result.results.forEach((roster) => {
      if (roster.shiftId && typeof roster.shiftId === 'object') {
        roster.shiftId = { ...roster.shiftId, totalActiveUsers: counts.get(String(roster.shiftId._id)) || 0 };
      }
    });
  }
  return result;
};

const getDayView = async (dateValue, filter = {}) => {
  const date = day(dateValue);
  const usersQuery = { role: filter.role || { $in: ['employee', 'staff'] }, isDeleted: { $ne: true } };
  if (filter.departmentId) usersQuery['workInformation.department'] = oid(filter.departmentId);
  if (filter.search) usersQuery.$or = [{ name: { $regex: filter.search, $options: 'i' } }, { employeeId: { $regex: filter.search, $options: 'i' } }];
  const users = await User.find(usersQuery).select('name employeeId role workInformation').populate('workInformation.department', 'departmentName departmentCode').lean();
  const records = await populateRoster(Roster.find({ date, status: 'scheduled' })).lean();
  const byUser = new Map(records.map((record) => [String(record.employeeId._id), record]));
  const shifts = new Map(); const unassigned = [];
  for (const user of users) {
    const record = byUser.get(String(user._id));
    if (!record || (filter.shiftId && String(record.shiftId._id) !== String(filter.shiftId))) {
      if (!record) unassigned.push({ employeeId: user._id, employeeCode: user.employeeId, name: user.name, role: user.role, designation: user.workInformation?.designation });
      continue;
    }
    const shiftKey = String(record.shiftId._id); if (!shifts.has(shiftKey)) shifts.set(shiftKey, { shift: { id: record.shiftId._id, name: record.shiftId.shiftName, code: record.shiftId.shiftCode }, employees: [] });
    shifts.get(shiftKey).employees.push({ employeeId: user._id, employeeCode: user.employeeId, name: user.name, role: user.role, designation: user.workInformation?.designation, rosterStatus: record.status });
  }
  return { date: date.toISOString().slice(0, 10), shifts: [...shifts.values()], unassigned };
};

const getEmployeeView = async (employeeId, fromDate, toDate) => {
  const user = await getEligibleUser(employeeId, true);
  const from = day(fromDate || new Date()); const to = day(toDate || from);
  if (to < from) throw new ApiError(httpStatus.BAD_REQUEST, 'toDate must be on or after fromDate');
  const records = await Roster.find({ employeeId: user._id, date: { $gte: from, $lte: end(to) }, status: 'scheduled' }).populate('shiftId', 'shiftName shiftCode shiftType weekOff isShiftActive').lean();
  const map = new Map(records.map((record) => [record.date.toISOString().slice(0, 10), record])); const days = [];
  for (let cursor = from; cursor <= to; cursor = new Date(cursor.getTime() + 86400000)) {
    const date = new Date(cursor); const key = date.toISOString().slice(0, 10); const roster = map.get(key); const effectiveShift = roster?.shiftId || await getEmployeeShiftForDate(user._id, date);
    days.push({ date: key, rosterStatus: roster ? roster.status : null, rosterShift: roster?.shiftId || null, effectiveShift });
  }
  return { employee: { employeeId: user._id, employeeCode: user.employeeId, name: user.name, role: user.role, designation: user.workInformation?.designation }, days };
};

const getEffectiveShiftForDate = async (employeeId, date) => {
  const roster = await Roster.findOne({ employeeId, date: day(date), status: 'scheduled' }).populate('shiftId').lean();
  return roster?.shiftId || getEmployeeShiftForDate(employeeId, date);
};

module.exports = { createRoster, updateRoster, cancelRoster, createBulk, queryRoster, getDayView, getEmployeeView, getEffectiveShiftForDate, ensureManagement };
