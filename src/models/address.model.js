const mongoose = require("mongoose");

const emergencyContactSchema = new mongoose.Schema({
  contactName: {
    type: String,
    trim: true,
  },
  phone: {
    type: Number,
    trim: true,
  },
  relattionship: {
    type: String,
    trim: true,
  },
  mobileNumber: {
    type: Number,
    trim: true,
  },
});

const addressSchema = new mongoose.Schema({
  addressLine1: {
    type: String,
    trim: true,
  },
  addressLine2: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    trim: true,
  },
  state: {
    type: String,
    trim: true,
  },
  pincode: {
    type: Number,
    trim: true,
  },
  emergencyContact: [emergencyContactSchema],
});

const Address = mongoose.model("Address", addressSchema);
module.exports = Address;
