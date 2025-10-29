const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const payrollRunSchema = mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  payrollFrequency: {
    type: String,
    enum: ["Weekly", "Biweekly", "Monthly"],
    required: true,
  },
  payPeriodStartDate: {
    type: Date,
    required: true,
  },
  payPeriodEndDate: {
    type: Date,
    required: true,
  },
  payDate: {
    type: Date,
    required: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Processing", "Completed", "Cancelled"],
    default: "Pending",
  },
});

payrollRunSchema.plugin(timestamps);

module.exports = mongoose.model("PayrollRun", payrollRunSchema);
