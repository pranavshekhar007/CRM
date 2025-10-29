const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const tripSchema = mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  purpose: {
    type: String,
    required: true,
    trim: true,
  },
  destination: {
    type: String,
    required: true,
    trim: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
  expectedOutcomes: {
    type: String,
    trim: true,
  },
  documents: [{
    fileUrl: { type: String },
    fileName: { type: String },
  }],
  advanceAmount: {
    type: Number,
    default: 0,
  },
  tripStatus: {
    type: String,
    enum: ["Planned", "Ongoing", "Completed", "Cancelled"],
    default: "Planned",
  },
  advanceStatus: {
    type: String,
    enum: ["Requested", "Approved", "Paid", "Reconciled"],
    default: "Requested",
  },
  reimbursementStatus: {
    type: String,
    enum: ["Pending", "Approved", "Paid"],
    default: "Pending",
  },
});

tripSchema.plugin(timestamps);

module.exports = mongoose.model("Trip", tripSchema);
