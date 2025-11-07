const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const reserveFundSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  description: { type: String, trim: true, default: "" },
});

reserveFundSchema.plugin(timestamps);

module.exports = mongoose.model("ReserveFund", reserveFundSchema);
