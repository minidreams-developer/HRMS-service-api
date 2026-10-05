const httpStatus = require('http-status');
const { Designation } = require('../models');
const { generateDesignationCode } = require('../utils/employeeId');
const ApiError = require('../utils/ApiError');
const duplicate = async (body, exclude) => Designation.findOne({ _id: exclude ? { $ne: exclude } : { $exists: true }, $or: [{ designationCode: body.designationCode }, { designationName: { $regex: `^${String(body.designationName || '').replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}$`, $options: 'i' } }] }).lean();
const createDesignation = async (body, actor) => { if (await duplicate(body)) throw new ApiError(httpStatus.CONFLICT, 'Designation already exists'); return Designation.create({ ...body, createdBy: actor?._id }); };
const queryDesignations = async (filter, options) => { const q = {}; if (filter.search) q.$or = [{ designationName: { $regex: filter.search, $options: 'i' } }, { designationCode: { $regex: filter.search, $options: 'i' } }]; if (filter.isActive !== undefined) q.isActive = filter.isActive; if (filter.status) q.isActive = filter.status === 'active'; return Designation.paginate(q, options); };
const getDesignationById = (id) => Designation.findById(id);
const getDesignationDropdown = async (search) => {
  const query = { isActive: { $ne: false } };
  if (search) query.designationName = { $regex: search, $options: 'i' };
  return Designation.find(query).select('_id designationName designationCode').sort({ designationName: 1 }).lean();
};
const updateDesignationById = async (id, body, actor) => { const d = await Designation.findById(id); if (!d) throw new ApiError(httpStatus.NOT_FOUND, 'Designation not found'); if (await duplicate({ designationCode: body.designationCode || d.designationCode, designationName: body.designationName || d.designationName }, id)) throw new ApiError(httpStatus.CONFLICT, 'Designation already exists'); Object.assign(d, body, { updatedBy: actor?._id }); return d.save(); };
const deleteDesignationById = async (id, actor) => { const d = await Designation.findById(id); if (!d) throw new ApiError(httpStatus.NOT_FOUND, 'Designation not found'); d.isActive = false; d.deactivatedBy = actor?._id; d.deactivatedAt = new Date(); return d.save(); };
const generateUniqueDesignationCode = async () => { let code; do { code = generateDesignationCode(); } while (await Designation.exists({ designationCode: code })); return code; };
module.exports = { createDesignation, queryDesignations, getDesignationById, getDesignationDropdown, updateDesignationById, deleteDesignationById, generateUniqueDesignationCode };
