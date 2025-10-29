const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const leaveApplicationSchema = mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  leaveType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LeaveType",
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  reason: {
    type: String,
    trim: true,
  },
  attachment: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
});

leaveApplicationSchema.plugin(timestamps);

module.exports = mongoose.model("LeaveApplication", leaveApplicationSchema);
