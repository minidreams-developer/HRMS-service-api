const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema({
    commission:
    {
        type:Number,
    },
    allowance:
    {
        type:Number,
    },
    salaryDisbursementType:
    {
        type:String,
    }
},
{
    timestamps:true
});

module.exports = mongoose.model("Commission",commissionSchema);