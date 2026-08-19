const mongoose = require("mongoose");

const assestSchema = new mongoose.Schema({
  assetName: {
    type: String,
  },
  assetSerialNumber: {
    type: String,
  },
  assetType: {
    type: String,
    default: "issued",
  },
  assetDescription: {
    type: String,
  },
  issuedDate: {
    type: Date,
  },
  assetContition: {
    type: String,
    default: "new",
  },
  assetStatus: {
    type: String,
    default: "currently_using",
  },
  isReturned: {
    type: Boolean,
    default: false,
  },
  returnCondition: {
    type: String,
    default: "good",
  },
  returnDate: {
    type: Date,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
}, { timestamps: true });

const Asset = mongoose.model("Asset", assestSchema);
module.exports = Asset;
