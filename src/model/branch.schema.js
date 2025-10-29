const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const branchSchema = mongoose.Schema({
  branchName: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    required: true,
    trim: true,
  },
  country: {
    type: String,
    required: true,
    trim: true,
  },
  zipcode: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
  },
  status: {
    type: Boolean,
    default: true,
  },
});

branchSchema.plugin(timestamps);

module.exports = mongoose.model("Branch", branchSchema);
