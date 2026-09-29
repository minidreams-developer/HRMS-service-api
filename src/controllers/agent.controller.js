const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const agentService = require('../services/agent.service');

const createAgent = catchAsync(async (req, res) => {
  // ── Address — wrap single object into array for the service ───────────────
  let addressData = null;
  if (req.body.address) {
    const a = req.body.address;
    addressData = [{
      addressLine1: a.addressLine1,
      addressLine2: a.addressLine2 || '',
      city: a.city,
      district: a.district,
      state: a.state,
      pincode: a.pincode,
      country: a.country || 'India',
    }];
  }

  // ── Document images — map to UserDocument schema fields ──────────────────
  // Accept either a single object or an array from the frontend
  let documentData = [];
  const rawDocs = req.body.documentImage || req.body.documents;
  if (rawDocs) {
    const docsArray = Array.isArray(rawDocs) ? rawDocs : [rawDocs];
    documentData = docsArray.map((doc) => ({
      documentName: doc.documentName || doc.name || 'unNamed',
      documentType: doc.documentType || 'personal',
      fileUrl: doc.fileUrl || doc.url || '',
    }));
  }

  let commissionData = null;
  if(req.body.commission && typeof req.body.commission === 'object')
  {
    const c = req.body.commission;
    commissionData={
        commission:c.commission,
        allowance:c.allowance,
        salaryDisbursementType:c.salaryDisbursementType,
    };
  }

  // ── Build agent payload ───────────────────────────────────────────────────
  const agentData = {
    agentId:req.body.agentId,
    name: req.body.name || req.body.agentName,
    email: req.body.email,
    password: req.body.password,
    phone: req.body.phone || req.body.contact,
    gender: req.body.gender,
    dateOfBirth: req.body.dateOfBirth,
    age: req.body.age,
    martialStatus: req.body.martialStatus,
    motherTongue: req.body.motherTongue,
    identificationMark: req.body.identificationMark,
    religion: req.body.religion,
    profilePic: req.body.profilePic,
    documentNo: req.body.documentNo,

    // Resolved below in service
    address: addressData,
    emergencyContacts: req.body.emergencyContacts || [],
    documentImage: documentData,
    commissionDetails:commissionData,
    referenceDetails:req.body.referenceDetails,
    workInformation: { branch: req.body.branch || req.body.workInformation?.branch },
  };

  const agent = await agentService.createAgent(agentData);
  res.status(httpStatus.CREATED).send(agent);
});

const getAgentId = catchAsync(async(req,res)=>{
    const createAgentId = await agentService.createAgentId();
    res.status(httpStatus.CREATED).send(createAgentId);
}) 

module.exports = {
  createAgent,
  getAgentId,
};
