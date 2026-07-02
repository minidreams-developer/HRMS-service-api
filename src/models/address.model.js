const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");


const addressSchema = new mongoose.Schema({
  addressLine1: {
    type: String,
    trim: true,
  },
  addressLine2: {
    type: String,
    trim: true,
  },
  district:
  {
    type:String,
    trim:true,
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
  country:
  {
    type:String,
    trim:true,
  }
});

addressSchema.plugin(toJSON);
addressSchema.plugin(paginate);

const Address = mongoose.model("Address", addressSchema);
module.exports = Address;
