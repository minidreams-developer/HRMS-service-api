const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const holidaySchema = new mongoose.Schema({
    holidayTitle: {
        type: String,
    },
    description: {
        type: String
    },
    month: {
        type: Number,
    },
    date: {
        type: Date
    },
    nextWorkingDay: {
        type: Date
    },
    status: {
        type: Boolean,
        default: true
    },

    people:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }],

    holidayImage: {
        type: String,
    },
    Remarks: {
        type: String
    },

}, { timestamps: true });

holidaySchema.plugin(toJSON);
holidaySchema.plugin(paginate);

const holiday = mongoose.model("Holiday", holidaySchema);
module.exports = holiday;