const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
    },
    description: {
      type: String,
    },
    content: {
      type: String,
    },
    scheduleDateAndTime: {
      type: Date,
    },
    images: [
      {
        imgName: {
          type: String,
        },
        imgUrl: {
          type: String,
        },
      },
    ],
  },
  { timestamps: true },
);

announcementSchema.plugin(toJSON);
announcementSchema.plugin(paginate);

const Announcement = mongoose.model("Announcement", announcementSchema);
module.exports = Announcement;
