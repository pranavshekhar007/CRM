const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const performanceGoalTypeSchema = mongoose.Schema({
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

performanceGoalTypeSchema.plugin(timestamps);

module.exports = mongoose.model("PerformanceGoalType", performanceGoalTypeSchema);
