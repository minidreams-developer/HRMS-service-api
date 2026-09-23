const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const permissionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Optional for legacy records; new requests always receive a derived date.
    date: { type: Date },
    totalHours: {
      type: Number,
      required: true,
    },
    from: {
      type: Date,
      required: true,
    },
    to: {
      type: Date,
      required: true,
    },
    permissionStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: "pending",
    },
    reason: { type: String, trim: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: Date,
    rejectionReason: String,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: Date,
    cancellationReason: String,
    isPermissionTimeEnded: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

permissionSchema.index({ user: 1, date: 1, from: 1, to: 1 });

permissionSchema.plugin(toJSON);
permissionSchema.plugin(paginate);

const Persmission = mongoose.model("Permission", permissionSchema);
module.exports = Persmission;
