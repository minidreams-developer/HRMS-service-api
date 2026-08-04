const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService } = require('../services');

const registerEmployee = catchAsync(async (req, res) => {
  const user = await userService.registerEmployee(req.body);
  res.status(httpStatus.CREATED).send(user);
});

const createUser = catchAsync(async (req, res) => {
  // Transform frontend payload to match backend schema
  const transformedData = {
    // Personal Information
    name: req.body.name || req.body.employeeName,
    email: req.body.email,
    phone: req.body.phone || req.body.contact,
    gender: req.body.gender,
    dateOfBirth: req.body.dateOfBirth,
    age: req.body.age,
    maritalStatus: req.body.maritalStatus,
    motherTongue: req.body.motherTongue,
    identificationMark: req.body.identificationMark,
    religion: req.body.religion,
    
    // Address Information
    address: req.body.address,
    city: req.body.city,
    district: req.body.district,
    state: req.body.state,
    pinCode: req.body.pinCode,
    
    // Profile
    profileImage: req.body.profileImage,
    
    // Authentication
    password: req.body.password || 'defaultPassword123',
    role: req.body.role || 'employee',
    
    // Work Details
    branch: req.body.branch,
    
    // Emergency Contacts
    emergencyContacts: req.body.emergencyContacts || [],
    
    // Documents
    documents: req.body.documents || [],
    
    // Remarks
    remarks: req.body.remarks,
    
    // Employee Details
    employee: {
      employeeId: req.body.employeeId,
      designation: req.body.designation,
      department: req.body.department,
      team: req.body.team,
      shift: req.body.shift,
      employeeType: req.body.employeeType,
      employeeStatus: req.body.employeeStatus || 'active',
      attendanceType: req.body.attendanceType,
      attendancePermission: req.body.attendancePermission,
      workInformation: {
        joinedDate: req.body.dateOfJoining,
        experienceType: req.body.experienceType,
        totalYearsOfExperience: req.body.totalYearsOfExperience,
        lastCompanyName: req.body.lastCompanyName,
        location: req.body.location,
        department: req.body.department,
      }
    },
    
    // Salary Details
    salaryDetails: {
      ctcAnnual: req.body.ctcAnnual,
      monthlyCTC: req.body.monthlyCTC,
      basicSalary: req.body.basicSalary,
      hra: req.body.hra,
      conveyanceAllowance: req.body.conveyanceAllowance,
      specialAllowance: req.body.specialAllowance,
      specialAllowance2: req.body.specialAllowance2,
      otherFixedAllowances: req.body.otherFixedAllowances,
    },
    
    // Bank Details
    bankDetails: {
      salaryDisbursementType: req.body.salaryDisbursementType,
      accHolderName: req.body.accHolderName,
      bank: req.body.bank,
      accNumber: req.body.accNumber,
      ifscCode: req.body.ifscCode,
      bankBranch: req.body.bankBranch,
      esiNumber: req.body.esiNumber,
      pfNumber: req.body.pfNumber,
    }
  };

  const user = await userService.createUser(transformedData);
  res.status(httpStatus.CREATED).send(user);
});

const getUsers = catchAsync(async (req, res) => {
  // ?distinct=department → return unique department names only
  if (req.query.distinct === 'department') {
    const departments = await userService.getDistinctDepartments();
    return res.send({ departments });
  }
  if (req.query.distinct === 'role') {
    const roles = await userService.getDistinctroles();
    return res.send({ roles });
  }

  const filter  = pick(req.query, ['name', 'role']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  // Basic filters passed directly to queryUsers
  if (req.query.empId) filter.employeeId = req.query.empId;

  // Advanced filters handled in the service
  const advancedFilters = {
    search:       req.query.search       || null,
    departmentId: req.query.departmentId || null,
    teamId:       req.query.teamId       || null,
    branchId:     req.query.branchId     || null,
    designation:  req.query.designation  || null,
    shiftId:      req.query.shiftId      || null,
    gender:       req.query.gender       || null,
    status:       req.query.status       || null,   // 'Active' | 'In-Active' | 'Relieved'
    joinedFrom:   req.query.joinedFrom   || null,
    joinedTo:     req.query.joinedTo     || null,
  };

  const result = await userService.queryUsers(filter, options, advancedFilters);
  res.send(result);
});

const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.send(user);
});

const updateUser = catchAsync(async (req, res) => {
  const user = await userService.updateUserById(req.params.userId, req.body);
  res.send(user);
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

const generateEmployeeId = catchAsync(async (req, res) => {
  const employeeId = await userService.generateEmployeeId();
  res.send({ employeeId });
});

module.exports = {
  registerEmployee,
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  generateEmployeeId
};
