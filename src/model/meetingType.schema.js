const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const meetingTypeSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  color: {
    type: String,
    trim: true,
  },
  defaultDuration: {
    type: Number, // in minutes
    default: 30,
  },
  status: {
    type: Boolean,
    default: true,
  },
});

meetingTypeSchema.plugin(timestamps);

module.exports = mongoose.model("MeetingType", meetingTypeSchema);
