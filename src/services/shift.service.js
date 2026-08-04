const httpStatus = require('http-status');
const { Shift } = require('../models');
const ApiError = require('../utils/ApiError');
const { generateShiftId } = require('../utils/employeeId');
const { setPending, getPending, clearPending } = require('../utils/pendingCode');

const SHIFT_CODE_KEY = 'shiftCode';

/**
 * Create a shift — clears the pending shiftCode once saved
 * @param {Object} body
 * @returns {Promise<Shift>}
 */
const createShift = async (body) => {
  const shift = await Shift.create(body);
  if (body.shiftCode && body.shiftCode === getPending(SHIFT_CODE_KEY)) {
    clearPending(SHIFT_CODE_KEY);
  }
  return shift;
};

/**
 * Query for shifts with search and filter support.
 *
 * Filter keys:
 *   search        — case-insensitive regex across shiftName, shiftCode, shiftType
 *   shiftName     — partial case-insensitive match
 *   shiftCode     — exact match
 *   shiftType     — partial case-insensitive match
 *   isShiftActive — boolean
 *   userId        — exact match on userId field
 *
 * @param {Object} filter
 * @param {Object} options - sortBy, limit, page
 * @returns {Promise<QueryResult>}
 */
const queryShifts = async (filter, options) => {
  const mongoFilter = {};

  // Free-text search across shift name, code and type
  if (filter.search) {
    const regex = { $regex: filter.search, $options: 'i' };
    mongoFilter.$or = [
      { shiftName: regex },
      { shiftCode: regex },
      { shiftType: regex },
    ];
  }

  // Individual field filters (only when search is not active)
  if (!filter.search) {
    if (filter.shiftName) {
      mongoFilter.shiftName = { $regex: filter.shiftName, $options: 'i' };
    }
    if (filter.shiftCode) {
      mongoFilter.shiftCode = filter.shiftCode;
    }
    if (filter.shiftType) {
      mongoFilter.shiftType = { $regex: filter.shiftType, $options: 'i' };
    }
  }

  // Active status filter — works alongside search
  if (filter.isShiftActive !== undefined && filter.isShiftActive !== null && filter.isShiftActive !== '') {
    mongoFilter.isShiftActive = filter.isShiftActive === true || filter.isShiftActive === 'true';
  }

  // userId filter
  if (filter.userId) {
    mongoFilter.userId = filter.userId;
  }

  return Shift.paginate(mongoFilter, options);
};

/**
 * Get shift by id
 * @param {ObjectId} id
 * @returns {Promise<Shift>}
 */
const getShiftById = async (id) => {
  return Shift.findById(id);
};

/**
 * Update shift by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<Shift>}
 */
const updateShiftById = async (id, updateBody) => {
  const shift = await getShiftById(id);
  if (!shift) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Shift not found');
  }
  Object.assign(shift, updateBody);
  await shift.save();
  return shift;
};

/**
 * Delete shift by id
 * @param {ObjectId} id
 * @returns {Promise<Shift>}
 */
const deleteShiftById = async (id) => {
  const shift = await getShiftById(id);
  if (!shift) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Shift not found');
  }
  await shift.deleteOne();
  return shift;
};

module.exports = {
  createShift,
  queryShifts,
  getShiftById,
  updateShiftById,
  deleteShiftById,
  generateUniqueShiftId,
};

/**
 * Generate a unique shiftCode not already in the database.
 * Returns the same code until it has been saved to the DB.
 * @returns {Promise<string>}
 */
async function generateUniqueShiftId() {
  const pending = getPending(SHIFT_CODE_KEY);

  if (pending) {
    const savedInDb = await Shift.exists({ shiftCode: pending });
    if (savedInDb) {
      clearPending(SHIFT_CODE_KEY);
    } else {
      return pending;
    }
  }

  let shiftCode;
  let exists = true;
  while (exists) {
    shiftCode = generateShiftId();
    // eslint-disable-next-line no-await-in-loop
    exists = await Shift.exists({ shiftCode });
  }

  setPending(SHIFT_CODE_KEY, shiftCode);
  return shiftCode;
}
