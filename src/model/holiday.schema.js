const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const holidaySchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    enum: ["National", "Religious", "Company Specific", "Regional"],
    required: true,
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
  recurringAnnualHoliday: {
    type: Boolean,
    default: false,
  },
  paidHoliday: {
    type: Boolean,
    default: false,
  },
  halfDay: {
    type: Boolean,
    default: false,
  },
  applicableBranches: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
    },
  ],
  status: {
    type: Boolean,
    default: true,
  },
});

holidaySchema.plugin(timestamps);

module.exports = mongoose.model("Holiday", holidaySchema);
