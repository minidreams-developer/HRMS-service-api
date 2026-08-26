const mongoose = require("mongoose");

const emergencyContactSchema = new mongoose.Schema({
    contactName: {
        type: String,
        trim: true,
    },
    phone: {
        type: Number,
    },
    mobileNumber: {
        type: Number,
    },
    relationship: {
        type: String,
        trim: true,
    },
    address: {
        addressLine1: { type: String, trim: true },
        addressLine2: { type: String, trim: true },
        city:         { type: String, trim: true },
        district:     { type: String, trim: true },
        state:        { type: String, trim: true },
        pincode:      { type: Number },
        country:      { type: String, trim: true },
    },
});

const emergencyContact = mongoose.model("EmergencyContact", emergencyContactSchema);
module.exports = emergencyContact;