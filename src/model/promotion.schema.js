const mongoose = require("mongoose");
const timestamps = require("mongoose-timestamp");

const promotionSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  previousDesignation: {
    type: String,
    required: true,
    trim: true,
  },
  newDesignation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Designation",
    required: true,
  },
  promotionDate: {
    type: Date,
    required: true,
  },
  effectiveDate: {
    type: Date,
    required: true,
  },
  salaryAdjustment: {
    type: Number,
  },
  reasonForPromotion: {
    type: String,
    trim: true,
  },
  document: {
    type: String, // Cloudinary URL
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
});

promotionSchema.plugin(timestamps);

module.exports = mongoose.model("Promotion", promotionSchema);
