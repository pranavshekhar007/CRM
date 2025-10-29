const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const warningSchema = mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  warningBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  warningType: {
    type: String,
    enum: [
      "Attendance",
      "Performance",
      "Conduct",
      "Policy Violation",
      "Safety",
      "Communication",
      "Insubordination",
      "Confidentiality",
    ],
    required: true,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  severity: {
    type: String,
    enum: ["Verbal", "Written", "Final"],
    required: true,
  },
  warningDate: {
    type: Date,
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
  document: {
    fileUrl: { type: String },
    fileName: { type: String },
  },
  expiryDate: {
    type: Date,
  },
  hasImprovementPlan: {
    type: Boolean,
    default: false,
  },
  improvementPlansGoals: {
    type: String,
    trim: true,
  },
  improvementPlanStartDate: {
    type: Date,
  },
  improvementPlanEndDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["Pending", "Acknowledged", "Closed"],
    default: "Pending",
  },
  acknowledgementDate: {
    type: Date,
  },
  employeeResponse: {
    type: String,
    trim: true,
  },
  improvementPlanProgress: {
    type: String,
  }
});

warningSchema.plugin(timestamps);

module.exports = mongoose.model("Warning", warningSchema);
