const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { Overtime, User } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create an overtime request
 */
const managementRoles = new Set(['manager', 'hr_manager', 'subAdmin', 'admin']);
const isManagement = (user) => managementRoles.has(user.role);
const utcDay = (value) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
const validateTimes = (body) => {
  const start = new Date(body.startTime); const end = new Date(body.endTime); const date = new Date(body.OvertimeDate);
  if ([start, end, date].some((v) => Number.isNaN(v.getTime()))) throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid overtime date or time');
  if (end <= start) throw new ApiError(httpStatus.BAD_REQUEST, 'endTime must be after startTime');
  if (utcDay(start).getTime() !== utcDay(date).getTime()) throw new ApiError(httpStatus.BAD_REQUEST, 'OvertimeDate must match the startTime calendar day');
  return { start, end, date: utcDay(start), totalDuration: Number(((end - start) / 3600000).toFixed(6)) };
};
const ensureNoOverlap = async (employeeId, start, end, excludeId) => {
  const query = { employeeId, status: { $in: ['pending', 'approved'] }, startTime: { $lt: end }, endTime: { $gt: start } };
  if (excludeId) query._id = { $ne: excludeId };
  if (await Overtime.exists(query)) throw new ApiError(httpStatus.CONFLICT, 'Overtime period overlaps an existing active request');
};
const createOvertime = async (body, actor) => {
  const employee = await User.findById(body.employeeId).lean();
  if (!employee) throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  if (!isManagement(actor) && String(body.employeeId) !== String(actor._id)) throw new ApiError(httpStatus.FORBIDDEN, 'Employees may only create their own overtime');
  const values = validateTimes(body);
  await ensureNoOverlap(body.employeeId, values.start, values.end);
  return Overtime.create({ ...body, OvertimeDate: values.date, totalDuration: values.totalDuration, createdBy: actor._id, statusHistory: [{ status: 'pending', changedBy: actor._id, changedAt: new Date(), reason: body.reason }] });
};

// Shared aggregation pipeline stages (after $match)
const buildLookupStages = () => [
  {
    $lookup: {
      from: 'users',
      localField: 'employeeId',
      foreignField: '_id',
      as: 'employeeData',
    },
  },
  { $unwind: { path: '$employeeData', preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: 'departments',
      let: { deptId: '$employeeData.workInformation.department' },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ['$_id', { $toObjectId: { $ifNull: ['$$deptId', '000000000000000000000000'] } }] },
          },
        },
        { $project: { departmentName: 1 } },
      ],
      as: 'departmentData',
    },
  },
  { $unwind: { path: '$departmentData', preserveNullAndEmptyArrays: true } },
  {
    $project: {
      _id: 1,
      requestedDate: 1,
      OvertimeDate: 1,
      startTime: 1,
      endTime: 1,
      totalDuration: 1,
      status: 1,
      createdAt: 1,
      updatedAt: 1,
      employee: {
        _id: '$employeeData._id',
        name: '$employeeData.name',
        employeeId: '$employeeData.employeeId',
        departmentName: { $ifNull: ['$departmentData.departmentName', null] },
      },
    },
  },
];

/**
 * Query overtime records with search, status, date range and employee filters.
 *
 * Filter keys:
 *   search     — regex across linked user's name, email, employeeId
 *   employeeId — exact ObjectId match
 *   status     — 'pending' | 'approved'
 *   fromDate   — OvertimeDate >= fromDate
 *   toDate     — OvertimeDate <= toDate
 */
const queryOvertime = async (filter, options) => {
  const { User } = require('../models');

  const limit = options.limit && parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : 10;
  const page  = options.page  && parseInt(options.page,  10) > 0 ? parseInt(options.page,  10) : 1;
  const skip  = (page - 1) * limit;

  let sort = { createdAt: 1 };
  if (options.sortBy) {
    sort = {};
    options.sortBy.split(',').forEach((opt) => {
      const [key, order] = opt.split(':');
      sort[key] = order === 'desc' ? -1 : 1;
    });
  }

  // ── Build $match stage ──────────────────────────────────────────────────
  const matchStage = {};

  // Search — resolve user IDs first, then scope overtime records
  if (filter.search) {
    const regex = { $regex: filter.search, $options: 'i' };
    const matchedUsers = await User.find(
      { $or: [{ name: regex }, { email: regex }, { employeeId: regex }] },
      { _id: 1 }
    ).lean();
    const userIds = matchedUsers.map((u) => u._id);
    matchStage.employeeId = { $in: userIds };
  }

  // Direct employeeId filter
  if (filter.employeeId && !filter.search) {
    matchStage.employeeId = new mongoose.Types.ObjectId(filter.employeeId);
  }

  // Status filter
  if (filter.status) {
    matchStage.status = filter.status;
  }

  // OvertimeDate range
  if (filter.fromDate || filter.toDate) {
    matchStage.OvertimeDate = {};
    if (filter.fromDate) matchStage.OvertimeDate.$gte = new Date(filter.fromDate);
    if (filter.toDate) {
      const end = new Date(filter.toDate);
      end.setUTCHours(23, 59, 59, 999);
      matchStage.OvertimeDate.$lte = end;
    }
  }

  const pipeline = [{ $match: matchStage }, ...buildLookupStages(), { $sort: sort }];

  const [totalResults, results] = await Promise.all([
    Overtime.countDocuments(matchStage),
    Overtime.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
  ]);

  return {
    results,
    page,
    limit,
    totalPages: Math.ceil(totalResults / limit),
    totalResults,
  };
};

/**
 * Get overtime by id with employee and department info
 */
const getOvertimeById = async (id) => {
  const results = await Overtime.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(id) } },
    ...buildLookupStages(),
  ]);
  return results[0] || null;
};

/**
 * Get overtime records by employeeId
 */
const getOvertimeByEmployee = async (employeeId, options) => {
  return Overtime.paginate({ employeeId }, options);
};

/**
 * Update overtime by id
 */
const updateOvertimeById = async (id, updateBody) => {
  const overtime = await Overtime.findById(id);
  if (!overtime) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Overtime request not found');
  }
  if (overtime.status !== 'pending') throw new ApiError(httpStatus.BAD_REQUEST, 'Only pending overtime requests may be edited');
  if (updateBody.startTime || updateBody.endTime || updateBody.OvertimeDate) {
    const values = validateTimes({ ...overtime.toObject(), ...updateBody });
    await ensureNoOverlap(overtime.employeeId, values.start, values.end, overtime._id);
    Object.assign(updateBody, { OvertimeDate: values.date, totalDuration: values.totalDuration });
  }
  Object.assign(overtime, updateBody);
  await overtime.save();
  return overtime;
};

/**
 * Update overtime status
 */
const updateOvertimeStatus = async (id, status, actor, metadata = {}) => {
  const overtime = await Overtime.findById(id);
  if (!overtime) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Overtime request not found');
  }
  if (!isManagement(actor)) throw new ApiError(httpStatus.FORBIDDEN, 'Only management may approve, reject, or cancel overtime');
  if (!((overtime.status === 'pending') || (overtime.status === 'approved' && status === 'cancelled'))) throw new ApiError(httpStatus.BAD_REQUEST, 'This overtime status cannot be changed');
  if (status === 'rejected' && !String(metadata.rejectionReason || '').trim()) throw new ApiError(httpStatus.BAD_REQUEST, 'rejectionReason is required');
  if (status === 'cancelled' && !String(metadata.cancellationReason || '').trim()) throw new ApiError(httpStatus.BAD_REQUEST, 'cancellationReason is required');
  overtime.status = status;
  if (status === 'approved') { overtime.approvedBy = actor._id; overtime.approvedAt = new Date(); }
  if (status === 'rejected') { overtime.rejectedBy = actor._id; overtime.rejectedAt = new Date(); overtime.rejectionReason = metadata.rejectionReason; }
  if (status === 'cancelled') { overtime.cancelledBy = actor._id; overtime.cancelledAt = new Date(); overtime.cancellationReason = metadata.cancellationReason; }
  if (!Array.isArray(overtime.statusHistory)) overtime.statusHistory = [];
  overtime.statusHistory.push({ status, changedBy: actor._id, changedAt: new Date(), reason: status === 'rejected' ? metadata.rejectionReason : metadata.cancellationReason });
  await overtime.save();
  return overtime;
};

/**
 * Delete overtime by id
 */
const deleteOvertimeById = async (id) => {
  const overtime = await Overtime.findById(id);
  if (!overtime) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Overtime request not found');
  }
  await overtime.deleteOne();
  return overtime;
};

module.exports = {
  createOvertime,
  queryOvertime,
  getOvertimeById,
  getOvertimeByEmployee,
  updateOvertimeById,
  updateOvertimeStatus,
  deleteOvertimeById,
};
