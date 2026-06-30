const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const workExperienceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.Mixed,
    },
    companyName: {
      type: String,
    },
    jobTitle: {
      type: String,
    },
    totalYearsOfExperience: {
      type: Number,
    },
    lastCompanyExperience: {
      type: Number,
    },
    relievedDate: {
      type: Date,
    },
    location: {
      type: String,
    },
  },
  { timestamps: true },
);

workExperienceSchema.plugin(toJSON);
workExperienceSchema.plugin(paginate);

const WorkExperience = mongoose.model("WorkExperience", workExperienceSchema);
module.exports = WorkExperience;
