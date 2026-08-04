const httpStatus = require('http-status');
const { Holiday, User } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a holiday
 * @param {Object} body
 * @returns {Promise<Holiday>}
 */
const createHoliday = async (body) => {
  return Holiday.create(body);
};

/**
 * Query holidays with search and filter support.
 *
 * Filter keys:
 *   search       — case-insensitive regex across holidayTitle, description, Remarks
 *   holidayTitle — partial case-insensitive match
 *   month        — exact month number (1-12)
 *   status       — boolean (true = active)
 *   fromDate     — holiday date >= fromDate
 *   toDate       — holiday date <= toDate
 *
 * @param {Object} filter
 * @param {Object} options - sortBy, limit, page
 * @returns {Promise<QueryResult>}
 */
const queryHolidays = async (filter, options) => {
  const mongoFilter = {};

  // Free-text search across title, description, remarks
  if (filter.search) {
    const regex = { $regex: filter.search, $options: 'i' };
    mongoFilter.$or = [
      { holidayTitle: regex },
      { description:  regex },
      { Remarks:      regex },
    ];
  }

  // Individual field filters (only when search is not active)
  if (!filter.search && filter.holidayTitle) {
    mongoFilter.holidayTitle = { $regex: filter.holidayTitle, $options: 'i' };
  }

  // Month filter — always applied alongside search
  if (filter.month !== undefined && filter.month !== null && filter.month !== '') {
    mongoFilter.month = Number(filter.month);
  }

  // Status filter — always applied alongside search
  if (filter.status !== undefined && filter.status !== null && filter.status !== '') {
    mongoFilter.status = filter.status === true || filter.status === 'true';
  }

  // Date range on holiday date
  if (filter.fromDate || filter.toDate) {
    mongoFilter.date = {};
    if (filter.fromDate) mongoFilter.date.$gte = new Date(filter.fromDate);
    if (filter.toDate) {
      const end = new Date(filter.toDate);
      end.setUTCHours(23, 59, 59, 999);
      mongoFilter.date.$lte = end;
    }
  }

  return Holiday.paginate(mongoFilter, options);
};

/**
 * Get holiday by id
 * @param {ObjectId} id
 * @returns {Promise<Holiday>}
 */
const getHolidayById = async (id) => {
  return Holiday.findById(id).populate('people', 'name email employeeId');
};

/**
 * Update holiday by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<Holiday>}
 */
const updateHolidayById = async (id, updateBody) => {
  const holiday = await getHolidayById(id);
  if (!holiday) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Holiday not found');
  }
  Object.assign(holiday, updateBody);
  await holiday.save();
  return holiday;
};

/**
 * Delete holiday by id
 * @param {ObjectId} id
 * @returns {Promise<Holiday>}
 */
const deleteHolidayById = async (id) => {
  const holiday = await getHolidayById(id);
  if (!holiday) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Holiday not found');
  }
  await holiday.remove();
  return holiday;
};

/**
 * Add a person to a holiday's people array
 * @param {ObjectId} holidayId
 * @param {ObjectId} userId
 * @returns {Promise<Holiday>}
 */
const addPerson = async (holidayId, userId) => {
  const holiday = await Holiday.findById(holidayId);
  if (!holiday) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Holiday not found');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const alreadyAdded = holiday.people.some((p) => p.toString() === userId.toString());
  if (alreadyAdded) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User is already added to this holiday');
  }

  holiday.people.push(userId);
  await holiday.save();
  return holiday.populate('people', 'name email employeeId');
};

/**
 * Remove a person from a holiday's people array
 * @param {ObjectId} holidayId
 * @param {ObjectId} userId
 * @returns {Promise<Holiday>}
 */
const removePerson = async (holidayId, userId) => {
  const holiday = await Holiday.findById(holidayId);
  if (!holiday) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Holiday not found');
  }

  const exists = holiday.people.some((p) => p.toString() === userId.toString());
  if (!exists) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User is not in this holiday');
  }

  holiday.people = holiday.people.filter((p) => p.toString() !== userId.toString());
  await holiday.save();
  return holiday.populate('people', 'name email employeeId');
};

module.exports = {
  createHoliday,
  queryHolidays,
  getHolidayById,
  updateHolidayById,
  deleteHolidayById,
  addPerson,
  removePerson,
};
