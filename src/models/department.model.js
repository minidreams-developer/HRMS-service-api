const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const departmentSchema = new mongoose.Schema(
  {
    departmentName: {
      type: String,
    },
    departmentDescription: {
      type: String,
    },
    departmentCode: {
      type: String,
    },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    isActive: { type: Boolean, default: true },
    deactivatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deactivatedAt: Date,
    departmentHead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    departmentEmployees: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    departmentTeams: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
  },
  { timestamps: true },
);

departmentSchema.plugin(toJSON);
departmentSchema.plugin(paginate);

const departmentModel = mongoose.model("Department", departmentSchema);
module.exports = departmentModel;
