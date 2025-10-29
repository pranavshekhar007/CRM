const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const performanceIndicatorCategorySchema = mongoose.Schema({
  categoryName: {
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

performanceIndicatorCategorySchema.plugin(timestamps);

module.exports = mongoose.model("PerformanceIndicatorCategory", performanceIndicatorCategorySchema);
