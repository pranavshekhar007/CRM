const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const goalSchema = mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  goalType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PerformanceGoalType",
    required: true,
  },
  goalTitle: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  target: {
    type: String,
    trim: true,
  },
  progress: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["NotStarted", "InProgress", "Completed"],
    default: "NotStarted",
  },
});

goalSchema.plugin(timestamps);

module.exports = mongoose.model("Goal", goalSchema);
