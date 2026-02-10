const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    departmentName: {
      type: String,
      required: true,
    },
    departmentDescription: {
      type: String,
      required: true,
    },
    departmentCode: {
      type: String,
      required: true,
    },
    departmentManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    departmentEmployees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    departmentTeams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
      },
    ],
  },
  { timestamps: true },
);

const departmentModel = mongoose.model("Department", departmentSchema);
module.exports = departmentModel;
