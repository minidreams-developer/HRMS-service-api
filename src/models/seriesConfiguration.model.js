const mongoose = require('mongoose');
const {toJSON,paginate} = require('./plugins');

const seriesConfigurationSchema = new mongoose.Schema(
    {
        seriesName:
        {
            type:String,
            required:true,
        },
        voucherType:
        {
            type:String,
        },
        prefix:
        {
            type:String,
            required:true,
        },
        suffix:
        {
            type:String,
            default:'',
        },
        startingNo:
        {
            type:Number,
            required:true,
        },
        lengthOfZero:
        {
            type:Number,
            required:true,
        },
        currentNumber: { type: Number, default: null },
        hasBeenUsed: { type: Boolean, default: false }

    },
    {
        timestamps:true,
    }
)

seriesConfigurationSchema.plugin(toJSON);
seriesConfigurationSchema.plugin(paginate);

const seriesConfiguration = mongoose.model("seriesConfiguration",seriesConfigurationSchema);

module.exports = seriesConfiguration;
