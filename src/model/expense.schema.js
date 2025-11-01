const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const expenseSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  amount: { type: Number, required: true },
  description: { type: String, trim: true, default: "" },
});

expenseSchema.plugin(timestamps);

module.exports = mongoose.model("Expense", expenseSchema);
