const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const profitSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  description: { type: String, trim: true, default: "" },
  loanRef: { type: mongoose.Schema.Types.ObjectId, ref: "LoanCollection", default: null },
});

profitSchema.plugin(timestamps);

module.exports = mongoose.model("Profit", profitSchema);
