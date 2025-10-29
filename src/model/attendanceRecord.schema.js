const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const attendanceRecordSchema = mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  inTime: {
    type: String, 
  },
  outTime: {
    type: String,
  },
  breakHours: {
    type: Number,
    default: 0,
  },
  totalHours: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["Present", "Absent", "HalfDay", "OnLeave", "Holiday"],
    default: "Absent",
  },
  holiday: {
    type: Boolean,
    default: false,
  },
  notes: {
    type: String,
    trim: true,
  },
});

attendanceRecordSchema.plugin(timestamps);

module.exports = mongoose.model("AttendanceRecord", attendanceRecordSchema);
