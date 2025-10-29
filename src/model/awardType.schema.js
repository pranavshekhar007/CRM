const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const awardTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  status: {
    type: Boolean,
    default: true,
  },
});

awardTypeSchema.plugin(timestamps);

module.exports = mongoose.model("AwardType", awardTypeSchema);
