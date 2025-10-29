const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const jobRequisitionSchema = mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  jobCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "JobCategory",
    required: true,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true,
  },
  positions: {
    type: Number,
    required: true,
  },
  minBudget: {
    type: Number,
    required: true,
  },
  maxBudget: {
    type: Number,
    required: true,
  },
  priority: {
    type: String,
    enum: ["Low", "Medium", "High"],
    default: "Medium",
  },
  skillsRequired: {
    type: [String],
    default: [],
  },
  educationRequired: {
    type: String,
    trim: true,
  },
  experienceRequired: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  responsibilities: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ["Open", "InProgress", "Closed", "Cancelled"],
    default: "Open",
  },
});

jobRequisitionSchema.plugin(timestamps);

module.exports = mongoose.model("JobRequisition", jobRequisitionSchema);
