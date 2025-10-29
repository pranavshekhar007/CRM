const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const employeeSalarySchema = mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  basicSalary: {
    type: Number,
    required: true,
  },
  salaryComponents: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalaryComponent",
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  notes: {
    type: String,
    trim: true,
  },
});

employeeSalarySchema.plugin(timestamps);

module.exports = mongoose.model("EmployeeSalary", employeeSalarySchema);
