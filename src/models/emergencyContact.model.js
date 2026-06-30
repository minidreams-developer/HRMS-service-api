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

const emergencyContact = mongoose.model("EmergencyContact", emergencyContactSchema);
module.exports = emergencyContact;