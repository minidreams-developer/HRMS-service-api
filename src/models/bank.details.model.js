const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const esiAndPf = new mongoose.Schema({
  esiNumber: {
    type: String,
    trim: true,
  },
  pfNumber: {
    type: String,
    trim: true,
  },
});

const bankDetailsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.Mixed,
    },
    accountHolderName: {
      type: String,
      trim: true,
    },
    bankName: {
      type: String,
      trim: true,
    },
    accountNumber: {
      type: String,
      trim: true,
    },
    ifscCode: {
      type: String,
      trim: true,
    },
    branch: {
      type: String,
      trim: true,
    },
    esiAndPf: {
      type: esiAndPf,
    },
  },
  {
    timestamps: true,
  },
);

bankDetailsSchema.plugin(toJSON);
bankDetailsSchema.plugin(paginate);

const bankDetailsModel = mongoose.model("BankDetails", bankDetailsSchema);
module.exports = bankDetailsModel;
