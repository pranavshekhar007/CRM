const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const announcementSchema = mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
  },
  shortDescription: {
    type: String,
    trim: true,
  },
  content: {
    type: String,
    trim: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  attachment:
    {
      fileUrl: { type: String },
    },
  featuredAnnouncement: {
    type: Boolean,
    default: false,
  },
  highPriority: {
    type: Boolean,
    default: false,
  },
  companyWideAnnouncement: {
    type: Boolean,
    default: false,
  },
  targetBranches: 
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
    },
  targetDepartments:
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
  status: {
    
    type: Boolean,
    default: true,
  },
});

announcementSchema.plugin(timestamps);

module.exports = mongoose.model("Announcement", announcementSchema);
