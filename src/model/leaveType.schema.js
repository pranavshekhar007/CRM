const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const leaveTypeSchema = mongoose.Schema({
  leaveType: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  maxDaysPerYear: {
    type: Number,
    required: true,
  },
  isPaid: {
    type: Boolean,
    default: false,
  },
  color: {
    type: String,
    trim: true,
  },
  status: {
    type: Boolean,
    default: true,
  },
});

leaveTypeSchema.plugin(timestamps);

module.exports = mongoose.model("LeaveType", leaveTypeSchema);
