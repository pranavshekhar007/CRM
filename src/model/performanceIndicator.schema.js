const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const performanceIndicatorSchema = mongoose.Schema({
  indicatorName: {
    type: String,
    required: true,
    trim: true,
  },
  indicatorCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PerformanceIndicatorCategory",
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
  measurementUnit: {
    type: String,
    trim: true,
  },
  targetValue: {
    type: String,
    trim: true,
  },
  status: {
    type: Boolean,
    default: true,
  },
});

performanceIndicatorSchema.plugin(timestamps);

module.exports = mongoose.model("PerformanceIndicator", performanceIndicatorSchema);
