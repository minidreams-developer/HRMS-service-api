const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { LeaveBalance, User } = require('../models');
const ApiError = require('../utils/ApiError');

const normalizeLeaveType = (value) => String(value || '').trim().toLowerCase();

const createBalance = async (body) => {
  const employee = await User.findById(body.employeeId).lean();
  if (!employee) throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  const leaveType = normalizeLeaveType(body.leaveType);
  const existing = await LeaveBalance.findOne({ employeeId: body.employeeId, leaveType, year: body.year });
  if (existing) throw new ApiError(httpStatus.CONFLICT, 'Leave balance already exists for employee, leave type, and year');
  return LeaveBalance.create({
    employeeId: body.employeeId,
    leaveType,
    year: body.year,
    allocated: body.allocated,
    isPaid: body.isPaid,
    requiresBalance: body.requiresBalance,
  });
};

const updateBalance = async (id, body) => {
  const balance = await LeaveBalance.findById(id);
  if (!balance) throw new ApiError(httpStatus.NOT_FOUND, 'Leave balance not found');
  if (body.allocated !== undefined && body.allocated < balance.used) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'allocated cannot be lower than used');
  }
  if (body.used !== undefined || body.remaining !== undefined) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'used and remaining cannot be changed directly');
  }
  if (body.allocated !== undefined) balance.allocated = body.allocated;
  if (body.isPaid !== undefined) balance.isPaid = body.isPaid;
  if (body.requiresBalance !== undefined) balance.requiresBalance = body.requiresBalance;
  await balance.save();
  return balance;
};

const getBalancesByEmployee = async (employeeId, year) => {
  const filter = { employeeId };
  if (year !== undefined) filter.year = year;
  return LeaveBalance.find(filter).sort({ year: -1, leaveType: 1 });
};

const getBalanceById = async (id) => {
  const balance = await LeaveBalance.findById(id);
  if (!balance) throw new ApiError(httpStatus.NOT_FOUND, 'Leave balance not found');
  return balance;
};

module.exports = { createBalance, updateBalance, getBalancesByEmployee, getBalanceById, normalizeLeaveType };
