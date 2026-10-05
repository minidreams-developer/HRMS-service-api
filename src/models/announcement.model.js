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
    audience: {
      roles: [{ type: String }],
      branches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
      departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
      teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
      designations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Designation' }],
      users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deactivatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deactivatedAt: Date,
    isActive: { type: Boolean, default: true },
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
