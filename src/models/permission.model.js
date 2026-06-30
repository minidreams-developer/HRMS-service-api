const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const permissionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.Mixed,
    },
    totalHours: {
      type: Number,
      default: 0,
    },
    from: {
      type: Date,
      default: Date.now,
    },
    to: {
      type: Date,
      default: Date.now,
    },
    permissionStatus: {
      type: String,
      default: "pending",
    },
    isPermissionTimeEnded: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

permissionSchema.plugin(toJSON);
permissionSchema.plugin(paginate);

const Persmission = mongoose.model("Permission", permissionSchema);
module.exports = Persmission;
