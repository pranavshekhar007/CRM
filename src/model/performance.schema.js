const mongoose = require("mongoose");

const performanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reviewPeriod: { type: String, required: true }, // e.g., "Q3 2025", "July 2025"
    goals: [
      {
        title: { type: String, required: true },
        description: { type: String },
        status: { type: String, enum: ["Pending", "In Progress", "Completed"], default: "Pending" },
        rating: { type: Number, min: 1, max: 5 },
      },
    ],
    overallRating: { type: Number, min: 1, max: 5 },
    remarks: { type: String },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Manager/Admin
  },
  { timestamps: true }
);

const Performance = mongoose.model("Performance", performanceSchema);

module.exports = Performance;
