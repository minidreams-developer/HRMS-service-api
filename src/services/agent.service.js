const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const User = require('../models/user.model');
const { Branch } = require('../models');
const Address = require('../models/address.model');
const UserDocument = require('../models/userDocuments.model');
const EmergencyContact = require('../models/emergencyContact.model');
const Commission = require('../models/commission.model');
const EmployeeIds = require('../utils/employeeId');

const createAgent = async (agentBody) => {
  if (agentBody.agentId && await User.exists({ agentId: agentBody.agentId })) throw new ApiError(httpStatus.CONFLICT, 'Agent ID already exists');
  const branchId = agentBody.workInformation?.branch;
  if (branchId) {
    const branch = await Branch.findOne({ _id: branchId, branchStatus: 'active' }).lean();
    if (!branch) throw new ApiError(httpStatus.BAD_REQUEST, 'Active Branch is required');
  }
  if (agentBody.email && (await User.isEmailTaken(agentBody.email))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  // ── 1. Create Address documents ───────────────────────────────────────────
  const addressIds = [];
  const rawAddresses = Array.isArray(agentBody.address)
    ? agentBody.address
    : agentBody.address
    ? [agentBody.address]
    : [];

  for (const addr of rawAddresses) {
    if (typeof addr === 'string') {
      addressIds.push(addr); // already an ObjectId ref
    } else {
      const created = await Address.create(addr);
      addressIds.push(created._id);
    }
  }

  // ── 2. Create EmergencyContact documents ──────────────────────────────────
  const emergencyContactIds = [];
  const rawContacts = agentBody.emergencyContacts || agentBody.emergencyContact || [];

  for (const ec of rawContacts) {
    if (typeof ec === 'string') {
      emergencyContactIds.push(ec); // already an ObjectId ref
    } else {
      let ecAddressId;
      if (ec.address && typeof ec.address === 'object') {
        const ecAddr = await Address.create(ec.address);
        ecAddressId = ecAddr._id;
      } else {
        ecAddressId = ec.address;
      }
      const created = await EmergencyContact.create({ ...ec, address: ecAddressId });
      emergencyContactIds.push(created._id);
    }
  }

  // ── 3. Create UserDocument records ────────────────────────────────────────
  // documentImage is an array of { documentName, documentType, fileUrl }
  const documentIds = [];
  const rawDocs = Array.isArray(agentBody.documentImage)
    ? agentBody.documentImage
    : agentBody.documentImage
    ? [agentBody.documentImage]
    : [];

  for (const doc of rawDocs) {
    if (typeof doc === 'string') {
      documentIds.push(doc); // already an ObjectId ref
    } else {
      const created = await UserDocument.create({
        documentName: doc.documentName || 'unNamed',
        documentType: doc.documentType || 'personal',
        fileUrl: doc.fileUrl || '',
      });
      documentIds.push(created._id);
    }
  }

  let commissionId = null;

  if(agentBody.commissionDetails)
  {
    if(typeof agentBody.commissionDetails==="string")
    {
        commissionId = agentBody.commissionDetails;
    }
    else
    {
        const createdCommission = await Commission.create(agentBody.commissionDetails);
        commissionId = createdCommission._id;
    }
  }

  // ── 4. Build and save User ────────────────────────────────────────────────
  const userData = {
    ...agentBody,
    role: 'agent',
    address: addressIds,
    emergencyContact: emergencyContactIds,
    userDocuments: documentIds,
    commissionDetails: commissionId, 
  };

  // Remove keys the User schema doesn't know about
  delete userData.emergencyContacts;
  delete userData.documentImage;

  return User.create(userData);
};

const createAgentId = async()=>
{
    const id = EmployeeIds.generateAgentId();
    return id;
}

module.exports = {
  createAgent,
  createAgentId,
};
