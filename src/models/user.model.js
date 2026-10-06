const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const { toJSON, paginate } = require("./plugins");
const { roles } = require("../config/roles");
const emergencyContact = require("./emergencyContact.model");
const SalaryDetails = require("./salaryDetails.model");
const Contractor = require("./contractors.model");
const Commission = require('./commission.model');

const Status = ['Active','In-Active','Relieved'];

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    employeeId: {
      type: String,
    },
    agentId:
    {
      type:String,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      validate(value) {
        if (value && !validator.isEmail(value)) {
          throw new Error("Invalid email");
        }
      },
    },
    password: {
      type: String,
      trim: true,
      minlength: 8,
      // validate(value) {
      //   if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
      //     throw new Error(
      //       "Password must contain at least one letter and one number"
      //     );
      //   }
      // },
      private: true, // used by the toJSON plugin
    },
    role: {
      type: String,
      enum: roles,
      default: "employee",
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      default: null,
    },

    phone: {
      type: Number,
      unique: true,
      sparse: true,
    },

    gender: {
      type: String,
      enum: ["male", "female","other"],
      lowercase: true,
    },

    dateOfBirth: {
      type: Date,
    },

    age: Number,

    spokenLanguages: [
      {
        type: String,
      },
    ],

    martialStatus: {
      type: String,
      default: "unMarried"
    },

    motherTongue: {
      type: String,
    },

    identificationMark: {
      type: String,
    },

    religion: {
      type: String
    },

    documentNo: {
      aadharNo: {
        type: Number
      },
      aadharFile:
      {
        type:String
      },
      panFile: {
        type: String
      },
      panNo: {
        type: String
      },
    },

    profilePic: {
      type: String,
    },

    // Numeric face-recognition descriptor. Never expose this field in API responses.
    faceEmbedding: {
      type: [Number],
      select: false,
      default: undefined,
    },

    address: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address"
    }],

    emergencyContact: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmergencyContact"
    }],

    employeeProfileStatus: {
      personalInformation: { type: Boolean, default: false },
      DocumentUploads: { type: Boolean, default: false },
      workDetails: { type: Boolean, default: false },
    },

    userDocuments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserDocument",
    }],

    workInformation: {
      joinedDate: { type: Date, default: Date.now },
      experienceType: { type: String },
      department: { type: mongoose.Schema.Types.Mixed },
      team: { type: mongoose.Schema.Types.Mixed },
      branch: { type: mongoose.Schema.Types.Mixed },
      contractAgent: { type: mongoose.Schema.Types.Mixed },
      reportingPerson: { type: mongoose.Schema.Types.Mixed },
      AttendanceType: { type: String },
      shiftId: { type: mongoose.Schema.Types.Mixed },
      bankDetails: [{ type: mongoose.Schema.Types.ObjectId, ref: "BankDetails" }],
      SalaryDetails: { type: mongoose.Schema.Types.ObjectId, ref: "SalaryDetails" },
      userRemarks: { type: String },
      designation: { type: String, default: "employee" },
      designationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation' },
      companyName: { type: String, trim: true },
      specialty: { type: String, trim: true },
      LicenseNo: { type: String, trim: true },
      dateOfJoining: { type: Date },
      jobItems: [{ type: mongoose.Schema.Types.ObjectId, ref: "Contractor" }],
      // Work experience fields
      workExperience: { type: String },
      totalExperience: { type: String },
      lastCompanyName: { type: String },
      lastCompanyExperience: { type: String },
      location: { type: String },
      reference: { type: String },
      // Exit/termination fields
      terminationDate: { type: Date },
      exitDate: { type: Date },
      relievedDate: { type: Date },
    },

    referenceDetails:{
      type:String,
    },

    commissionDetails:
    {
      type:mongoose.Schema.Types.ObjectId,
      ref:"Commission",
    },

    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    firebaseToken: {
      type: String,
      default: null,
      private: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isProfileCompleted: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: String,
      enum: Status,
      default: "Active",
    },

    // Soft delete fields
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
userSchema.plugin(toJSON);
userSchema.plugin(paginate);

/**
 * Check if email is taken
 * @param {string} email - The user's email
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({
    email,
    _id: {
      $ne: excludeUserId,
    },
  });
  return !!user;
};

/**
 * Check if password matches the user's password
 * @param {string} password
 * @returns {Promise<boolean>}
 */
userSchema.methods.isPasswordMatch = async function (password) {
  const user = this;
  return bcrypt.compare(password, user.password);
};

userSchema.pre("save", async function (next) {
  const user = this;
  if (user.isModified("password") && user.password) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

/**
 * @typedef User
 */
const User = mongoose.model("User", userSchema);

module.exports = User;
