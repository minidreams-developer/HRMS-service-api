const crypto = require("crypto");

/** Generate Employee Id */
function generateEmployeeId() {
  const prefix = "EMP";
  const randomNumber = crypto.randomInt(100000, 999999); // 5-digit number
  return `${prefix}${randomNumber}`;
}

/** Generate Team Id */
function generateTeamId() {
  const prefix = "TEAM";
  const randomNumber = crypto.randomInt(100000, 999999);
  return `${prefix}${randomNumber}`;
}

/** Generate Department Id */
function generateDepartmentId() {
  const prefix = "DEPT";
  const randomNumber = crypto.randomInt(100000, 999999);
  return `${prefix}${randomNumber}`;
}

/** Generate Branch Id */
function generateBranchId() {
  const prefix = "BRN";
  const randomNumber = crypto.randomInt(100000, 999999);
  return `${prefix}${randomNumber}`;
}

/** Generate Shift Id */
function generateShiftId() {
  const prefix = "SHF";
  const randomNumber = crypto.randomInt(100000, 999999);
  return `${prefix}${randomNumber}`;
}

function generateAgentId(){
  const prefix = "AGT";
  const randomNumber = crypto.randomInt(100000, 999999);
  return `${prefix}${randomNumber}`;
}

module.exports = {
  generateEmployeeId,
  generateTeamId,
  generateDepartmentId,
  generateBranchId,
  generateShiftId,
  generateAgentId,
};
