const mongoose = require("mongoose");

// Location Schema for cities
const LocationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    nameEn: {
      type: String,
      default: function () {
        return this.name;
      },
    },
    nameUz: {
      type: String,
      required: true,
    },
    nameCyrillic: {
      type: String,
      default: function () {
        return this.nameCr || this.nameUz;
      },
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
    region: {
      type: String,
      default: "Unknown",
    },
    population: {
      type: Number,
      default: 0,
    },
    priority: {
      type: Number,
      default: 999,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isCustom: {
      type: Boolean,
      default: false,
      index: true,
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
LocationSchema.index({ region: 1, isActive: 1 });
LocationSchema.index({ priority: 1, population: -1 });
LocationSchema.index({ nameUz: 1, nameEn: 1, nameCr: 1, nameRu: 1 });

module.exports = mongoose.model("Location", LocationSchema);
