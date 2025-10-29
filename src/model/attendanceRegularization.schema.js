const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const attendanceRegularizationSchema = mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  attendanceRecord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AttendanceRecord",
    required: true,
  },
  requestedClockIn: {
    type: String,
    required: true,
  },
  requestedClockOut: {
    type: String,
    required: true,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
});

attendanceRegularizationSchema.plugin(timestamps);

module.exports = mongoose.model(
  "AttendanceRegularization",
  attendanceRegularizationSchema
);
