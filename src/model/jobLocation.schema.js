const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const jobLocationSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  remote: {
    type: Boolean,
    default: false,
  },
  address: {
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
  country: {
    type: String,
    trim: true,
  },
  postalCode: {
    type: String,
    trim: true,
  },
  status: {
    type: Boolean,
    default: true,
  },
});

jobLocationSchema.plugin(timestamps);

module.exports = mongoose.model("JobLocation", jobLocationSchema);
