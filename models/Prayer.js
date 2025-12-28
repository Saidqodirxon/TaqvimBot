const mongoose = require("mongoose");

// Prayer Schema - for managing prayers (duolar)
const PrayerSchema = new mongoose.Schema(
  {
    title: {
      uz: { type: String, required: true },
      cr: { type: String, required: true },
      ru: { type: String, required: true },
    },
    content: {
      uz: { type: String, required: true },
      cr: { type: String, required: true },
      ru: { type: String, required: true },
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

const Prayer = mongoose.model("Prayer", PrayerSchema);

module.exports = Prayer;
