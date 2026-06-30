const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const esiAndPf = new mongoose.Schema({
  esiNumber: {
    type: Number,
    trim: true,
  },
  pfNumber: {
    type: Number,
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
      type: Number,
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
