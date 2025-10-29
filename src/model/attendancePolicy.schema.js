const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const attendancePolicySchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  lateArrivalGrace: {
    type: Number,
    default: 0,
  },
  earlyDepartureGrace: {
    type: Number,
    default: 0,
  },
  overtimeRatePerHour: {
    type: Number,
    default: 0,
  },
  status: {
    type: Boolean,
    default: true,
  },
});

attendancePolicySchema.plugin(timestamps);

module.exports = mongoose.model("AttendancePolicy", attendancePolicySchema);
