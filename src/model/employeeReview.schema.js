const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const employeeReviewSchema = mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  reviewCycle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ReviewCycle",
    required: true,
  },
  reviewDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["Scheduled", "InProgress"],
    default: "Scheduled",
  },
});

employeeReviewSchema.plugin(timestamps);

module.exports = mongoose.model("EmployeeReview", employeeReviewSchema);
