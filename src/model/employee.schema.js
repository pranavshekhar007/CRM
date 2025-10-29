const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");
const employeeSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  employeeId: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, trim: true },
  dob: { type: Date },
  gender: { type: String, enum: ["Male", "Female", "Other"] },
  profileImage: { type: String },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
  designation: { type: mongoose.Schema.Types.ObjectId, ref: "Designation" },
  dateOfJoining: { type: Date },
  employmentType: {
    type: String,
    enum: ["FullTime", "PartTime", "Contract", "Internship", "Temporary"],
    default: "FullTime",
  },
  employmentStatus: {
    type: String,
    enum: ["Active", "Inactive", "Probation", "Terminated"],
    default: "Active",
  },
  shift: {
    type: String,
    enum: [
      "Morning Shift (09:00 - 18:00)",
      "Evening Shift (14:00 - 23:00)",
      "Night Shift (22:00 - 07:00)",
    ],
    default: "Morning Shift (09:00 - 18:00)",
  },
  attendancePolicy: {
    type: String,
    enum: [
      "Standard Attendance Policy",
      "Flexible Attendance Policy",
      "Strict Attendance Policy",
    ],
    default: "Standard Attendance Policy",
  },
  addressLine1: { type: String, trim: true },
  addressLine2: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  country: { type: String, trim: true },
  zipCode: { type: String, trim: true },
  emergencyName: { type: String, trim: true },
  relationship: { type: String, trim: true },
  emergencyPhoneNumber: { type: String, trim: true },
  bankName: { type: String, trim: true },
  accountHolderName: { type: String, trim: true },
  accountNumber: { type: String, trim: true },
  bankIdentifierCode: { type: String, trim: true },
  bankBranch: { type: String, trim: true },
  taxPayerId: { type: String, trim: true },
  documents: [
    {
      documentType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DocumentType",
      },
      fileUrl: { type: String },
      expiryDate: { type: Date },
      status: {
        type: String,
        enum: ["Pending", "Verified", "Rejected"],
        default: "Pending",
      },
    },
  ],
  transfers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transfer",
    },
  ],

});
employeeSchema.plugin(timestamps);
module.exports = mongoose.model("Employee", employeeSchema);
