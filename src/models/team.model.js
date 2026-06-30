const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const teamSchema = new mongoose.Schema(
  {
    teamName: {
      type: String,
    },
    teamDescription: {
      type: String,
    },
    teamCode: {
      type: String,
    },
    teamLead: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    teamEmployees: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
  },
  { timestamps: true },
);

teamSchema.plugin(toJSON);
teamSchema.plugin(paginate);

const teamModel = mongoose.model("Team", teamSchema);
module.exports = teamModel;
