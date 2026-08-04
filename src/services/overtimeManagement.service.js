const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { Overtime } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create an overtime request
 */
const createOvertime = async (body) => {
  return Overtime.create(body);
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
  Object.assign(overtime, updateBody);
  await overtime.save();
  return overtime;
};

/**
 * Update overtime status
 */
const updateOvertimeStatus = async (id, status) => {
  const overtime = await Overtime.findById(id);
  if (!overtime) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Overtime request not found');
  }
  overtime.status = status;
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
