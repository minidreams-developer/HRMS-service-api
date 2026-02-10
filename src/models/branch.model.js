const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema(
  {
    branchName: {
      type: String,
    },
    branchHead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    branchNumber: {
      type: String,
    },
    activeStatus: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true },
);

const Branch = mongoose.model("Branch", branchSchema);
module.exports = Branch;
