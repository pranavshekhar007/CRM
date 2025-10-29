const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const designationSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true,
  },
  status: {
    type: Boolean,
    default: true,
  },
});

designationSchema.plugin(timestamps);

module.exports = mongoose.model("Designation", designationSchema);
