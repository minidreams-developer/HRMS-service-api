const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const { toJSON, paginate } = require("./plugins");

const contractorSchema = mongoose.Schema(
    {
        jobItems:
        {
            type:String,
            trim:true,
            required:true,
        },
        unit:
        {
            type:String,
            trim:true,
            required:true,
        },
        price:
        {
            type:Number,
            default:0.00,
        },
        region:
        {
            type:String,
            trim:true,
        }
    }   
)

contractorSchema.plugin(toJSON);
contractorSchema.plugin(paginate);


const Contractor = mongoose.model("Contractor",contractorSchema);

module.exports = Contractor;