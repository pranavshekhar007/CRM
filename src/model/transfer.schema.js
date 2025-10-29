const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const transferSchema = mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  fromBranch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    required: true,
  },
  fromDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true,
  },
  fromDesignation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Designation",
    required: true,
  },
  toBranch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    required: true,
  },
  toDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true,
  },
  toDesignation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Designation",
    required: true,
  },
  transferDate: {
    type: Date,
    required: true,
  },
  effectiveDate: {
    type: Date,
  },
  reason: {
    type: String,
    trim: true,
  },
  document: {
    fileUrl: { type: String },
    fileName: { type: String },
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
});

transferSchema.plugin(timestamps);

module.exports = mongoose.model("Transfer", transferSchema);
