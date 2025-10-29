const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const jobCategorySchema = mongoose.Schema({
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

jobCategorySchema.plugin(timestamps);

module.exports = mongoose.model("JobCategory", jobCategorySchema);
