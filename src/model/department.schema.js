const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const departmentSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    required: true,
  },
  description: {
    type: String,
  },
  status: {
    type: Boolean,
    default: true,
  },
});
departmentSchema.plugin(timestamps);

module.exports = mongoose.model("Department", departmentSchema);
