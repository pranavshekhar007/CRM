const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const complaintSchema = mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  against: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  complaintType: {
    type: String,
    enum: [
      "Harassment",
      "Discrimination",
      "Workplace Conditions",
      "Bullying",
      "Unfair Treatment",
      "Compensation Issues",
      "Work Schedule",
      "Safety Concerns",
      "Ethics Violation",
      "Management Issues",
    ],
    required: true,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  complaintDate: {
    type: Date,
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
  documents: {
    fileUrl: { type: String },
    fileName: { type: String },
  },
  submitAnonymously: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ["Submitted", "Under Investigation", "Resolved", "Dismissed"],
    default: "Submitted",
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
  },
  resolutionDeadline: {
    type: Date,
  },
  resolutionType: {
    type: String,
    enum: ["Resolved", "Dismissed"],
  },
  investigationNotes: {
    type: String,
    trim: true,
  },
  resolutionAction: {
    type: String,
    trim: true,
  },
  resolutionDate: {
    type: Date,
  },
  followUpAction: {
    type: String,
    trim: true,
  },
  followUpDate: {
    type: Date,
  },
  followUpFeedback: {
    type: String,
    trim: true,
  },
});

complaintSchema.plugin(timestamps);

module.exports = mongoose.model("Complaint", complaintSchema);
