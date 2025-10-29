const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const salaryComponentSchema = mongoose.Schema({
  componentName: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    enum: ["earning", "deduction"],
    required: true,
  },
  calculationType: {
    type: String,
    enum: ["fixedAmount", "percentageOfBasic"],
    required: true,
  },
  fixedAmount: {
    type: Number,
    default: 0,
  },
  percentageOfBasic: {
    type: Number,
    default: 0,
  },
  isTaxable: {
    type: Boolean,
    default: false,
  },
  isMandatory: {
    type: Boolean,
    default: false,
  },
  status: {
    type: Boolean,
    default: true,
  },
});

salaryComponentSchema.plugin(timestamps);

module.exports = mongoose.model("SalaryComponent", salaryComponentSchema);
