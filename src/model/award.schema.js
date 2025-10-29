const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const awardSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  awardType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AwardType",
    required: true,
  },
  awardDate: {
    type: Date,
    required: true,
  },
  gift: {
    type: String,
    trim: true,
  },
  monetaryValue: {
    type: Number,
  },
  description: {
    type: String,
    trim: true,
  },
  certificate: {
    type: String,
  },
  photo: {
    type: String,
  },
});

awardSchema.plugin(timestamps);

module.exports = mongoose.model("Award", awardSchema);
