const mongoose = require("mongoose");

const assestSchema = {
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
};

const Asset = mongoose.model("Asset", assestSchema);
module.exports = Asset;
