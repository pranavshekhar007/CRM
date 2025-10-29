const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const reviewCycleSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  frequency: {
    type: String,
    enum: ["Monthly", "Quarterly", "Semi-Annual", "Annual", "One-time"],
    required: true,
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

reviewCycleSchema.plugin(timestamps);

module.exports = mongoose.model("ReviewCycle", reviewCycleSchema);
