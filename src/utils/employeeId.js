const crypto = require("crypto");

/** Generate Employee Id */
function generateEmployeeId() {
  const prefix = "EMP";
  const randomNumber = crypto.randomInt(100000, 999999); // 5-digit number
  return `${prefix}${randomNumber}`;
}

//console.log(generateBookingId()); // example: COOKDIN654321

module.exports = {
  generateEmployeeId,
};
