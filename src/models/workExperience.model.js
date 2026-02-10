const mongoose = require("mongoose");

const workExperienceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

const WorkExperience = mongoose.model("WorkExperience", workExperienceSchema);
module.exports = WorkExperience;
