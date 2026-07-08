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
    relationship: {
        type: String,
        trim: true,
    },
    address:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Address"
    },
});

const emergencyContact = mongoose.model("EmergencyContact", emergencyContactSchema);
module.exports = emergencyContact;