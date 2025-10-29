const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const installmentSchema = new mongoose.Schema({
  installAmount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

const loanCollectionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  loanAmount: { type: Number, required: true },
  givenAmount: { type: Number, required: true },
  perDayCollection: { type: Number, required: true },
  daysForLoan: { type: Number, required: true },
  totalDueInstallments: { type: Number, required: true },
  totalPaidInstallments: { type: Number, default: 0 },
  totalPaidLoan: { type: Number, default: 0 },
  remainingLoan: { type: Number, required: true },
  adharCard: { type: String, trim: true },
  panCard: { type: String, trim: true },
  referenceBy: { type: String, trim: true },
  status: {
    type: String,
    enum: ["Open", "Closed"],
    default: "Open",
  },
  installments: [installmentSchema],
});

loanCollectionSchema.plugin(timestamps);

module.exports = mongoose.model("LoanCollection", loanCollectionSchema);
