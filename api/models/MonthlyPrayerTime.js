const mongoose = require("mongoose");

// Monthly Prayer Times Schema
const MonthlyPrayerTimeSchema = new mongoose.Schema(
  {
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    hijriDate: {
      day: Number,
      month: String,
      year: Number,
    },
    timings: {
      fajr: { type: String, required: true },
      sunrise: { type: String, required: true },
      dhuhr: { type: String, required: true },
      asr: { type: String, required: true },
      maghrib: { type: String, required: true },
      isha: { type: String, required: true },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast lookups
MonthlyPrayerTimeSchema.index({ locationId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("MonthlyPrayerTime", MonthlyPrayerTimeSchema);
