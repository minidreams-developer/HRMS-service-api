const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const organizationSchema = new mongoose.Schema(
  {
    organizationLogo: {
      type: String,
      trim: true,
    },

    companyName: {
      type: String,
      trim: true,
    },

    gst: {
      type: String,
      trim: true,
    },

    pan: {
      type: String,
      trim: true,
    },

    tan: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    address: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address',
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

organizationSchema.plugin(toJSON);
organizationSchema.plugin(paginate);

const Organization = mongoose.model('Organization', organizationSchema);

module.exports = Organization;