const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const jobPositionSchema = mongoose.Schema({
  jobRequisition: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "JobRequisition",
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  jobType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "JobType",
    required: true,
  },
  jobLocation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "JobLocation",
    required: true,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true,
  },
  minExperience: {
    type: Number,
    required: true,
  },
  maxExperience: {
    type: Number,
    required: true,
  },
  minSalary: {
    type: Number,
    required: true,
  },
  maxSalary: {
    type: Number,
    required: true,
  },
  applicationDeadline: {
    type: Date,
    required: true,
  },
  featuredJob: {
    type: Boolean,
    default: false,
  },
  description: {
    type: String,
    trim: true,
  },
  requirements: {
    type: String,
    trim: true,
  },
  benefits: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ["Open", "Closed", "Cancelled"],
    default: "Open",
  },
});

jobPositionSchema.plugin(timestamps);

module.exports = mongoose.model("JobPosition", jobPositionSchema);
