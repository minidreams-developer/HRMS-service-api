const mongoose = require("mongoose");
const { toJSON, paginate } = require('./plugins');

const salaryDetailsSchema = new mongoose.Schema(
  {
    basicSalary: {
      type: Number,
      default: 0,
    },
    annualCTC: {
      type: Number,
      default: 0,
    },
    monthlyCTC: {
      type: Number,
      default: 0,
    },
    houseRentAllowance: {
      type: Number,
      default: 0,
    },
    conveyanceAllowance: {
      type: Number,
      default: 0,
    },
    specialAllowance: {
      type: Number,
      default: 0,
    },
    otherFixedAllowance: {
      type: Number,
      default: 0,
    },
    pfAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    esiAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

salaryDetailsSchema.plugin(toJSON);
salaryDetailsSchema.plugin(paginate);

const SalaryDetails = mongoose.model("SalaryDetails", salaryDetailsSchema);
module.exports = SalaryDetails;
