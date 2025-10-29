const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const candidateSourceSchema = mongoose.Schema({
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

candidateSourceSchema.plugin(timestamps);

module.exports = mongoose.model("CandidateSource", candidateSourceSchema);
