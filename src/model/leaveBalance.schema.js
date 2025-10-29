const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const leaveBalanceSchema = mongoose.Schema({
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
  year: {
    type: Number,
    required: true,
  },
  allocatedDays: {
    type: Number,
    required: true,
    default: 0,
  },
  carriedForwardDays: {
    type: Number,
    default: 0,
  },
  manualAdjustment: {
    type: Boolean,
    default: false,
  },
  adjustmentReason: {
    type: String,
    trim: true,
  },
  adjustmentAmount: {
    type: Number,
    default: 0,
  },
  reasonForAdjustment: {
    type: String,
    trim: true,
  },
});

leaveBalanceSchema.plugin(timestamps);

module.exports = mongoose.model("LeaveBalance", leaveBalanceSchema);
