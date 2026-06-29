const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const teamSchema = new mongoose.Schema(
  {
    teamName: {
      type: String,
    },
    name: {
      type: String,
    },
    teamDescription: {
      type: String,
    },
    teamCode: {
      type: String,
    },
    teamId: {
      type: String,
    },
    teamLead: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
    },
    teamEmployees: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    department: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Department",
    },
    leadDepartment: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Department",
    },
  },
  { timestamps: true },
);

teamSchema.plugin(toJSON);
teamSchema.plugin(paginate);

const teamModel = mongoose.model("Team", teamSchema);
module.exports = teamModel;
