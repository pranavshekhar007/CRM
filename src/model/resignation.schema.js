const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const resignationSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  resignationDate: {
    type: Date,
    required: true,
  },
  lastWorkingDay: {
    type: Date,
    required: true,
  },
  noticePeriod: {
    type: String,
  },
  reason: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  documents: {
    type: String, // Cloudinary file URL
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected", "Withdrawn"],
    default: "Pending",
  },
  exitInterviewConducted: {
    type: String,
    enum: ["Yes", "No", "Scheduled"],
    default: "No",
  },
  exitInterviewDate: {
    type: Date,
  },
  exitFeedback: {
    type: String,
    trim: true,
  },
});

resignationSchema.plugin(timestamps);

module.exports = mongoose.model("Resignation", resignationSchema);
