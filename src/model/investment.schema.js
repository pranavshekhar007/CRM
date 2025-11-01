const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const investmentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  amount: { type: Number, required: true },
  durationType: { type: String, enum: ["Month", "Year"], required: true },
  durationValue: { type: Number, required: true },
  description: { type: String, trim: true, default: "" },
});

investmentSchema.plugin(timestamps);

module.exports = mongoose.model("Investment", investmentSchema);
