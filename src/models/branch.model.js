  const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const branchSchema = new mongoose.Schema(
  {
    // Basic Details
    branchName: {
      type: String,
    },
    branchNumber: {
      type: String,
    },
    branchType: {
      type: String,
    },
    branchStatus: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    effectiveFromDate: {
      type: Date,
    },

    // Contact Details
    branchHead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    phoneNumber: {
      type: String,
    },
    emergencyContactNumber: {
      type: String,
    },
    email: {
      type: String,
    },

    // Address
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

    // Other Details
    departments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
      },
    ],
    shifts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shift",
      },
    ],
  },
  { timestamps: true }
);

branchSchema.plugin(toJSON);
branchSchema.plugin(paginate);

const Branch = mongoose.model("Branch", branchSchema);
module.exports = Branch;
