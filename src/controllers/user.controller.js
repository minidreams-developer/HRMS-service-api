const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService } = require('../services');

const registerEmployee = catchAsync(async (req, res) => {
  console.log('[registerEmployee] req.body:', JSON.stringify(req.body, null, 2));
  console.log('[registerEmployee] addresses:', req.body.addresses);
  console.log('[registerEmployee] emergencyContacts:', req.body.emergencyContacts);
  console.log('[registerEmployee] bankDetails:', req.body.bankDetails);
  console.log('[registerEmployee] salaryDetails:', req.body.salaryDetails);
  console.log('[registerEmployee] created user:',req.bodycommissionDetails || null);
  const user = await userService.registerEmployee(req.body);
  console.log('[registerEmployee] created user:', user._id, user.employeeId);
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

  // if(req.query.distinct === 'agent')
  // {
  //   const agents = await userService.getDistinctContractAgents();
  //   return res.send({ agents });
  // }
  const filter  = pick(req.query, ['name', 'role']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  // Basic filters passed directly to queryUsers
  if (req.query.empId) filter.employeeId = req.query.empId;

  // Advanced filters handled in the service
  const advancedFilters = {
    search:        req.query.search        || null,
    departmentId:  req.query.departmentId  || null,
    teamId:        req.query.teamId        || null,
    branchId:      req.query.branchId      || null,
    designation:   req.query.designation   || null,
    shiftId:       req.query.shiftId       || null,
    gender:        req.query.gender        || null,
    status:        req.query.status        || null,
    joinedFrom:    req.query.joinedFrom    || null,
    joinedTo:      req.query.joinedTo      || null,
    contractAgent: req.query.contractAgent || null,
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
  console.log('[updateUser] userId:', req.params.userId);
  console.log('[updateUser] req.body:', JSON.stringify(req.body, null, 2));
  console.log('[updateUser] files:', req.files?.map(f => f.originalname));

  // If files were uploaded alongside the PATCH, save them as user documents
  if (req.files && req.files.length > 0) {
    const documentType = req.query.documentType || req.body.documentType || 'personal';
    await userService.uploadUserDocuments(req.params.userId, req.files, documentType, null);
  }

  const user = await userService.updateUserById(req.params.userId, req.body);
  console.log('[updateUser] updated user:', user._id, user.employeeId);
  res.send(user);
});

const deleteUser = catchAsync(async (req, res) => {
  // Pass the authenticated user's ID for deletedBy tracking
  const deletedByUserId = req.user?._id || req.user?.id || null;
  await userService.deleteUserById(req.params.userId, deletedByUserId);
  res.status(httpStatus.OK).send({ message: 'Employee deleted successfully' });
});

const getEmployeeCount = catchAsync(async (req, res) => {
  const count = await userService.getEmployeeCount(req.query);
  res.send(count);
});

const generateEmployeeId = catchAsync(async (req, res) => {
  const employeeId = await userService.generateEmployeeId();
  res.send({ employeeId });
});

const generateStaffId = catchAsync(async (req, res) => {
  const staffId = await userService.generateStaffId();
  res.send({ staffId });
});

const generateAgentId = catchAsync(async (req, res) => {
  const agentId = await userService.generateAgentId();
  res.send({ agentId });
});

/**
 * POST /v1/users/:userId/documents
 * Accepts either:
 * 1. multipart/form-data with file uploads (req.files) - NOT RECOMMENDED, use /v1/media/upload instead
 * 2. application/json with pre-uploaded document URLs (RECOMMENDED)
 *    Body format:
 *    {
 *      "documentType": "personal" | "government",  // optional, defaults to "personal"
 *      "documents": [
 *        {
 *          "fileUrl": "https://res.cloudinary.com/...",  // REQUIRED - from /v1/media/upload response (url field)
 *          "documentName": "Passport",                   // optional - human-readable name
 *          "fileName": "passport.pdf",                    // optional - original file name
 *          "mimeType": "application/pdf",                // optional - from /v1/media/upload
 *          "publicId": "hrms/media/doc_abc123"           // optional - from /v1/media/upload
 *        }
 *      ]
 *    }
 * 
 * Query param: ?documentType=government | personal (default: personal)
 */
const uploadUserDocuments = catchAsync(async (req, res) => {
  console.log('[uploadUserDocuments] userId:', req.params.userId);
  console.log('[uploadUserDocuments] files:', req.files?.length || 0);
  console.log('[uploadUserDocuments] body:', JSON.stringify(req.body, null, 2));

  const user = await userService.uploadUserDocuments(
    req.params.userId,
    req.files,
    req.query.documentType || req.body.documentType || 'personal',
    req.body.documents || req.body.documentImage
  );
  res.send(user);
});

const getEmployeeByEmpId = catchAsync(async (req, res) => {
  const user = await userService.getUserByEmployeeId(req.params.employeeId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  }
  res.send(user);
});

const getAgentMembers = catchAsync(async (req, res) => {
  const { agentId } = req.params;
  const options = pick(req.query, ['page', 'limit']);
  const filters = {
    status:     req.query.status     || null,
    joinedFrom: req.query.joinedFrom || null,
    joinedTo:   req.query.joinedTo   || null,
    role:       req.query.role       || null,  // optionally scope to 'employee' or 'staff' only
  };
  const result = await userService.getAgentMembers(agentId, options, filters);
  res.send(result);
});

/**
 * GET /v1/users/dropdown
 * Returns users for dropdown, filtered by role (agent, staff, employee)
 * Query params:
 *   - role: single role or comma-separated roles (e.g., ?role=agent or ?role=agent,staff,employee)
 *   - search: search term for name, email, or employeeId
 * Returns minimal data: { _id, name, employeeId, role, email, profilePic }
 */
const getUsersDropdown = catchAsync(async (req, res) => {
  const filters = {};
  
  // Handle role filter - support comma-separated values
  if (req.query.role) {
    const roles = req.query.role.split(',').map(r => r.trim());
    filters.role = roles.length === 1 ? roles[0] : roles;
  }
  
  // Handle search filter
  if (req.query.search) {
    filters.search = req.query.search;
  }
  
  const users = await userService.getUsersDropdown(filters);
  res.send(users);
});

/**
 * PATCH /v1/users/:userId/documents/:documentId
 * Updates a specific user document's metadata
 * Body: { documentName, documentType, fileUrl, fileName, mimeType, publicId }
 */
const updateUserDocument = catchAsync(async (req, res) => {
  console.log('[updateUserDocument] userId:', req.params.userId);
  console.log('[updateUserDocument] documentId:', req.params.documentId);
  console.log('[updateUserDocument] body:', req.body);

  const document = await userService.updateUserDocument(
    req.params.userId,
    req.params.documentId,
    req.body
  );
  res.send(document);
});

/**
 * DELETE /v1/users/:userId/documents/:documentId
 * Deletes a specific user document
 */
const deleteUserDocument = catchAsync(async (req, res) => {
  console.log('[deleteUserDocument] userId:', req.params.userId);
  console.log('[deleteUserDocument] documentId:', req.params.documentId);

  await userService.deleteUserDocument(req.params.userId, req.params.documentId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  registerEmployee,
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getEmployeeCount,
  generateEmployeeId,
  generateStaffId,
  generateAgentId,
  uploadUserDocuments,
  updateUserDocument,
  deleteUserDocument,
  getEmployeeByEmpId,
  getAgentMembers,
  getUsersDropdown,
};
