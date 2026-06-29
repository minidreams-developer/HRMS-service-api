const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const branchSchema = new mongoose.Schema(
  {
    branchName: {
      type: String,
    },
    name: {
      type: String,
    },
    branchHead: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
    },
    branchNumber: {
      type: String,
    },
    branchType: {
      type: String,
    },
    activeStatus: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    status: {
      type: String,
    },
    effectiveFromDate: {
      type: Date,
    },
    phoneNumber: {
      type: String,
    },
    emergencyContact: {
      type: String,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
    },
    city: {
      type: String,
    },
    district: {
      type: String,
    },
    state: {
      type: String,
    },
    pinCode: {
      type: String,
    },
    geoLocation: {
      type: String,
    },
    departments: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    shifts: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
  },
  { timestamps: true },
);

branchSchema.plugin(toJSON);
branchSchema.plugin(paginate);

const Branch = mongoose.model("Branch", branchSchema);
module.exports = Branch;
