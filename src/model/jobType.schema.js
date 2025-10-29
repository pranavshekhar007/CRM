const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const jobTypeSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  status: {
    type: Boolean,
    default: true,
  },
});

jobTypeSchema.plugin(timestamps);

module.exports = mongoose.model("JobType", jobTypeSchema);
