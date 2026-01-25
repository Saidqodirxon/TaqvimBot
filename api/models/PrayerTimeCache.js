const mongoose = require("mongoose");

/**
 * Prayer Time Cache Schema - muvaffaqiyatli API javoblarini saqlash
 */
const PrayerTimeCacheSchema = new mongoose.Schema(
  {
    // Location identifier (latitude_longitude)
    locationKey: {
      type: String,
      required: true,
      index: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    // Date for these prayer times (YYYY-MM-DD format)
    date: {
      type: String,
      required: true,
      index: true,
    },
    // Prayer times data
    timings: {
      fajr: String,
      sunrise: String,
      dhuhr: String,
      asr: String,
      maghrib: String,
      isha: String,
      midnight: String,
    },
    // Hijri date
    hijri: {
      date: String,
      month: {
        en: String,
        uz: String,
      },
      year: String,
      designation: {
        abbreviated: String,
        expanded: String,
      },
    },
    // Calculation method info
    meta: {
      method: {
        id: Number,
        name: String,
      },
      school: String,
      midnightMode: String,
      latitudeAdjustment: String,
    },
    // Settings used for calculation
    settings: {
      method: Number,
      school: Number,
      midnightMode: Number,
      latitudeAdjustment: Number,
    },
    // Source of data
    source: {
      type: String,
      enum: ["aladhan-api", "monthly", "manual"],
      default: "aladhan-api",
    },
    // Cache metadata
    fetchedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast lookups
PrayerTimeCacheSchema.index({ locationKey: 1, date: 1 });

// Automatic cleanup of expired cache
PrayerTimeCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PrayerTimeCache", PrayerTimeCacheSchema);
