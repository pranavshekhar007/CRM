const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const candidateSchema = mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "JobPosition",
    required: true,
  },
  source: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CandidateSource",
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  currentCompany: {
    type: String,
    trim: true,
  },
  currentPosition: {
    type: String,
    trim: true,
  },
  experience: {
    type: Number,
    default: 0,
  },
  currentSalary: {
    type: Number,
  },
  expectedSalary: {
    type: Number,
  },
  noticePeriod: {
    type: String,
  },
  applicationDate: {
    type: Date,
    default: Date.now,
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
  },
  skills: {
    type: [String],
  },
  education: {
    type: String,
  },
  portfolioUrl: {
    type: String,
  },
  linkedinUrl: {
    type: String,
  },
  status: {
    type: String,
    enum: ["Applied", "Under Review", "Interview Scheduled", "Selected", "Rejected"],
    default: "Applied",
  },
});

candidateSchema.plugin(timestamps);

module.exports = mongoose.model("Candidate", candidateSchema);
