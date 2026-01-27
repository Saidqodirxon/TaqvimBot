const mongoose = require("mongoose");

/**
 * PrayerTimeData Model
 *
 * Permanent storage for prayer times (60 days forward)
 * This is NOT cache - this is persistent data
 * Should NOT expire after 7 days
 *
 * Used for:
 * - Fast prayer time lookups
 * - Reducing Aladhan API calls
 * - Historical prayer time data
 */
const PrayerTimeDataSchema = new mongoose.Schema(
  {
    locationKey: {
      type: String,
      required: true,
      index: true,
      description: "Format: latitude_longitude (e.g., 41.2995_69.2401)",
    },
    cityName: {
      type: String,
      required: true,
      description: "Primary city name",
    },
    cityNameUz: {
      type: String,
      description: "City name in Uzbek (Latin)",
    },
    cityNameRu: {
      type: String,
      description: "City name in Russian (Cyrillic)",
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    region: {
      type: String,
      description: "Region/viloyat name",
    },
    date: {
      type: String,
      required: true,
      index: true,
      description: "Date in YYYY-MM-DD format",
    },
    timings: {
      Fajr: { type: String, required: true },
      Sunrise: { type: String, required: true },
      Dhuhr: { type: String, required: true },
      Asr: { type: String, required: true },
      Maghrib: { type: String, required: true },
      Isha: { type: String, required: true },
      Midnight: String,
      Imsak: String,
      Sunset: String,
      Firstthird: String,
      Lastthird: String,
    },
    method: {
      type: Number,
      default: 3,
      description: "Prayer calculation method (3 = MWL - Muslim World League)",
    },
    school: {
      type: Number,
      default: 1,
      description: "Juristic school (1 = Hanafi, 0 = Shafi)",
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "prayertimedata",
    timestamps: true,
  }
);

// Compound indexes for fast queries
PrayerTimeDataSchema.index({ locationKey: 1, date: 1 }, { unique: true });
PrayerTimeDataSchema.index({ cityName: 1, date: 1 });
PrayerTimeDataSchema.index({ cityNameUz: 1, date: 1 });
PrayerTimeDataSchema.index({ region: 1, date: 1 });
PrayerTimeDataSchema.index({ date: 1 });
PrayerTimeDataSchema.index({ createdAt: 1 });

// Static method to get prayer times for a location and date
PrayerTimeDataSchema.statics.getPrayerTimes = async function (
  latitude,
  longitude,
  date
) {
  const locationKey = `${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
  const dateStr =
    typeof date === "string" ? date : date.toISOString().split("T")[0];

  return await this.findOne({ locationKey, date: dateStr }).lean();
};

// Static method to get prayer times for date range
PrayerTimeDataSchema.statics.getPrayerTimesRange = async function (
  latitude,
  longitude,
  startDate,
  endDate
) {
  const locationKey = `${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
  const startDateStr =
    typeof startDate === "string"
      ? startDate
      : startDate.toISOString().split("T")[0];
  const endDateStr =
    typeof endDate === "string" ? endDate : endDate.toISOString().split("T")[0];

  return await this.find({
    locationKey,
    date: { $gte: startDateStr, $lte: endDateStr },
  })
    .sort({ date: 1 })
    .lean();
};

// Static method to check if data exists for location and date range
PrayerTimeDataSchema.statics.hasDataForRange = async function (
  latitude,
  longitude,
  startDate,
  endDate
) {
  const locationKey = `${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
  const startDateStr =
    typeof startDate === "string"
      ? startDate
      : startDate.toISOString().split("T")[0];
  const endDateStr =
    typeof endDate === "string" ? endDate : endDate.toISOString().split("T")[0];

  const count = await this.countDocuments({
    locationKey,
    date: { $gte: startDateStr, $lte: endDateStr },
  });

  // Calculate expected days
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const expectedDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  return count >= expectedDays;
};

// Static method to get statistics by region
PrayerTimeDataSchema.statics.getStatsByRegion = async function () {
  return await this.aggregate([
    {
      $group: {
        _id: "$region",
        totalEntries: { $sum: 1 },
        cities: { $addToSet: "$cityNameUz" },
        minDate: { $min: "$date" },
        maxDate: { $max: "$date" },
      },
    },
    {
      $project: {
        region: "$_id",
        totalEntries: 1,
        cityCount: { $size: "$cities" },
        minDate: 1,
        maxDate: 1,
      },
    },
    { $sort: { totalEntries: -1 } },
  ]);
};

// Static method to get statistics by city
PrayerTimeDataSchema.statics.getStatsByCity = async function () {
  return await this.aggregate([
    {
      $group: {
        _id: "$cityNameUz",
        cityNameRu: { $first: "$cityNameRu" },
        region: { $first: "$region" },
        totalEntries: { $sum: 1 },
        minDate: { $min: "$date" },
        maxDate: { $max: "$date" },
      },
    },
    {
      $project: {
        cityNameUz: "$_id",
        cityNameRu: 1,
        region: 1,
        totalEntries: 1,
        minDate: 1,
        maxDate: 1,
      },
    },
    { $sort: { totalEntries: -1 } },
  ]);
};

const PrayerTimeData = mongoose.model("PrayerTimeData", PrayerTimeDataSchema);

module.exports = PrayerTimeData;
