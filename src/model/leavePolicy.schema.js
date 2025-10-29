const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const leavePolicySchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  leaveType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LeaveType",
    required: true,
  },
  accuralType: {
    type: String,
    enum: ["Yearly", "Monthly"],
    required: true,
  },
  accuralRate: {
    type: Number, 
    required: true,
  },
  carryForwardLimit: {
    type: Number,
    default: 0,
  },
  minDaysPerApplication: {
    type: Number,
    required: true,
  },
  maxDaysPerApplication: {
    type: Number,
    required: true,
  },
  requiresApproval: {
    type: Boolean,
    default: true,
  },
  status: {
    type: Boolean,
    default: true,
  },
});

leavePolicySchema.plugin(timestamps);

module.exports = mongoose.model("LeavePolicy", leavePolicySchema);
