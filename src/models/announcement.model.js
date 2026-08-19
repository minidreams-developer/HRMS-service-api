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
    // draft     — saved but not yet scheduled
    // scheduled — has a future scheduleDateAndTime, waiting to be published
    // published — visible to all users (either immediately or after schedule)
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published'],
      default: 'draft',
    },
    publishedAt: {
      type: Date,
      default: null,
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
