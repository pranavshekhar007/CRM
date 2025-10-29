const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const documentTypeSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
  },
  required: {
    type: Boolean,
    default: false,
  },
});

documentTypeSchema.plugin(timestamps);

module.exports = mongoose.model("DocumentType", documentTypeSchema);
