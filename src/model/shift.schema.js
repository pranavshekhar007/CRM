const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const shiftSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  breakDuration: {
    type: Number,
    default: 0,
  },
  breakStartTime: {
    type: String,
  },
  breakEndTime: {
    type: String,
  },
  gracePeriod: {
    type: Number, // in minutes
    default: 0,
  },
  nightShift: {
    type: Boolean,
    default: false,
  },
  status: {
    type: Boolean,
    default: true,
  },
});

shiftSchema.plugin(timestamps);

module.exports = mongoose.model("Shift", shiftSchema);
