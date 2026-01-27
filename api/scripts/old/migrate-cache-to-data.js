const mongoose = require("mongoose");
require("dotenv").config();

// Old model
const PrayerTimeCache = require("./models/PrayerTimeCache");

// New model schema for permanent data
const PrayerTimeDataSchema = new mongoose.Schema(
  {
    locationKey: { type: String, required: true, index: true },
    cityName: { type: String, required: true },
    cityNameUz: String,
    cityNameRu: String,
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    region: String,
    date: { type: String, required: true, index: true },
    timings: {
      Fajr: String,
      Sunrise: String,
      Dhuhr: String,
      Asr: String,
      Maghrib: String,
      Isha: String,
      Midnight: String,
    },
    method: { type: Number, default: 3 }, // MWL
    school: { type: Number, default: 1 }, // Hanafi
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "prayer_time_data" }
);

// Compound index for fast lookups
PrayerTimeDataSchema.index({ locationKey: 1, date: 1 }, { unique: true });
PrayerTimeDataSchema.index({ cityName: 1, date: 1 });
PrayerTimeDataSchema.index({ date: 1 });

const PrayerTimeData = mongoose.model("PrayerTimeData", PrayerTimeDataSchema);

// Location model
const Location = require("./models/Location");

async function migrateData() {
  try {
    console.log("\n" + "=".repeat(70));
    console.log("🔄 MIGRATION: PrayerTimeCache → PrayerTimeData");
    console.log("=".repeat(70) + "\n");

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected\n");

    // Get all cache entries
    const cacheEntries = await PrayerTimeCache.find({}).lean();
    console.log(`📊 Found ${cacheEntries.length} cache entries\n`);

    // Get all locations for city name mapping
    const locations = await Location.find({ isActive: true }).lean();
    console.log(`🏙️  Found ${locations.length} active locations\n`);

    // Create location map for fast lookup
    const locationMap = new Map();
    locations.forEach((loc) => {
      const key = `${loc.latitude.toFixed(4)}_${loc.longitude.toFixed(4)}`;
      locationMap.set(key, loc);
    });

    console.log("🔄 Starting migration...\n");

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < cacheEntries.length; i++) {
      const cache = cacheEntries[i];

      // Get location info
      const location = locationMap.get(cache.locationKey);

      if (!location) {
        errorCount++;
        continue;
      }

      try {
        // Create data entry
        await PrayerTimeData.findOneAndUpdate(
          {
            locationKey: cache.locationKey,
            date: cache.date,
          },
          {
            $setOnInsert: {
              locationKey: cache.locationKey,
              cityName: location.name,
              cityNameUz: location.nameUz,
              cityNameRu: location.nameRu,
              latitude: location.latitude,
              longitude: location.longitude,
              region: location.region,
              date: cache.date,
              timings: cache.timings,
              method: 3,
              school: 1,
              createdAt: new Date(),
            },
          },
          { upsert: true, new: true }
        );

        successCount++;

        // Progress indicator
        if ((i + 1) % 100 === 0 || i === cacheEntries.length - 1) {
          console.log(
            `   ⏳ Progress: ${i + 1}/${cacheEntries.length} entries processed`
          );
        }
      } catch (error) {
        if (error.code === 11000) {
          skipCount++;
        } else {
          errorCount++;
          console.error(
            `   ❌ Error for ${cache.locationKey} on ${cache.date}:`,
            error.message
          );
        }
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("✅ MIGRATION COMPLETED");
    console.log("=".repeat(70));
    console.log(`✅ Successfully migrated: ${successCount}`);
    console.log(`⏭️  Skipped (already exists): ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log("=".repeat(70) + "\n");

    // Show sample data
    const sampleData = await PrayerTimeData.find({}).limit(5).lean();
    console.log("📋 Sample migrated data:\n");
    sampleData.forEach((data) => {
      console.log(`   📍 ${data.cityNameUz} (${data.cityNameRu})`);
      console.log(`   📅 Date: ${data.date}`);
      console.log(
        `   🕌 Fajr: ${data.timings.Fajr} | Dhuhr: ${data.timings.Dhuhr} | Asr: ${data.timings.Asr}`
      );
      console.log();
    });

    console.log(
      "🗑️  Do you want to delete old cache collection? (Manual step)"
    );
    console.log("   Run: db.prayer_time_caches.drop() in MongoDB shell\n");

    await mongoose.disconnect();
    console.log("✅ Database connection closed");
  } catch (error) {
    console.error("❌ Migration error:", error);
    process.exit(1);
  }
}

migrateData();
