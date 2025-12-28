const mongoose = require("mongoose");

// Location Schema for cities
const LocationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    nameUz: {
      type: String,
      required: true,
    },
    nameCr: {
      type: String,
      required: true,
    },
    nameRu: {
      type: String,
      required: true,
    },
    apiName: {
      type: String,
      required: false,
      default: function () {
        return this.name;
      },
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    timezone: {
      type: String,
      default: "Asia/Tashkent",
    },
    country: {
      type: String,
      default: "Uzbekistan",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    // Manual prayer times (optional - if not set, API will be used)
    manualPrayerTimes: {
      enabled: {
        type: Boolean,
        default: false,
      },
      fajr: String,
      sunrise: String,
      dhuhr: String,
      asr: String,
      maghrib: String,
      isha: String,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

// Add index for geospatial queries
LocationSchema.index({ latitude: 1, longitude: 1 });
LocationSchema.index({ isActive: 1 });

module.exports = mongoose.model("Location", LocationSchema);
