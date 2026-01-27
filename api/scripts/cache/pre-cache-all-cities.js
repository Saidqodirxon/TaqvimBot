/**
 * PRE-CACHE ALL 200+ UZBEKISTAN CITIES
 * This script will cache prayer times for ALL cities in the database
 * Only caches dates that don't exist yet (incremental caching)
 */

require("dotenv").config();
const mongoose = require("mongoose");
const axios = require("axios");
const Location = require("./models/Location");
const PrayerTimeCache = require("./models/PrayerTimeCache");

const DAYS_TO_CACHE = 90; // 90 days forward
const DELAY_BETWEEN_REQUESTS = 200; // ms
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // Start with 2 seconds

// Statistics
const stats = {
  total: 0,
  success: 0,
  failed: 0,
  skipped: 0,
  duplicates: 0,
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPrayerTimes(latitude, longitude, date, retryCount = 0) {
  try {
    const dateStr = date.toISOString().split("T")[0];
    const url = `https://api.aladhan.com/v1/timings/${dateStr}`;

    const response = await axios.get(url, {
      params: {
        latitude,
        longitude,
        method: 1, // Karachi University
        school: 1, // Hanafi
      },
      timeout: 10000,
    });

    if (response.data && response.data.data && response.data.data.timings) {
      return response.data.data.timings;
    }

    throw new Error("Invalid API response");
  } catch (error) {
    // Check for flood wait
    if (error.response?.data?.data?.includes("FLOOD_WAIT_")) {
      const waitTime = parseInt(error.response.data.data.split("_")[2]) || 60;
      console.log(`   ⏳ Flood wait detected: ${waitTime}s`);
      await delay(waitTime * 1000);
      return fetchPrayerTimes(latitude, longitude, date, retryCount);
    }

    // Retry logic
    if (retryCount < MAX_RETRIES) {
      const waitTime = RETRY_DELAY * Math.pow(2, retryCount);
      console.log(
        `   ⚠️  Retry ${retryCount + 1}/${MAX_RETRIES} after ${waitTime}ms`
      );
      await delay(waitTime);
      return fetchPrayerTimes(latitude, longitude, date, retryCount + 1);
    }

    throw error;
  }
}

async function cacheForLocation(location, startDate) {
  const locationKey = `${location.latitude.toFixed(4)}_${location.longitude.toFixed(4)}`;
  let cached = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < DAYS_TO_CACHE; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const dateStr = currentDate.toISOString().split("T")[0];

    // Check if already cached
    const existing = await PrayerTimeCache.findOne({
      locationKey,
      date: dateStr,
    });
    if (existing) {
      skipped++;
      stats.duplicates++;
      continue;
    }

    try {
      const timings = await fetchPrayerTimes(
        location.latitude,
        location.longitude,
        currentDate
      );

      // Save to cache
      const cache = new PrayerTimeCache({
        locationKey,
        date: dateStr,
        fajr: timings.Fajr,
        sunrise: timings.Sunrise,
        dhuhr: timings.Dhuhr,
        asr: timings.Asr,
        maghrib: timings.Maghrib,
        isha: timings.Isha,
        source: "pre-cache-all-cities",
        expiresAt: new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000),
      });

      await cache.save();
      cached++;
      stats.success++;
      stats.total++;

      // Rate limiting
      await delay(DELAY_BETWEEN_REQUESTS);
    } catch (error) {
      failed++;
      stats.failed++;
      stats.total++;
      console.log(`   ❌ Failed for ${dateStr}: ${error.message}`);
    }
  }

  return { cached, skipped, failed };
}

async function preCacheAllCities() {
  try {
    console.log("🇺🇿 Pre-caching Prayer Times for ALL Uzbekistan Cities");
    console.log("=".repeat(60));

    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected!");

    // Get all active locations from DB (sorted by priority)
    const locations = await Location.find({ isActive: true })
      .select("name nameUz region latitude longitude population priority")
      .sort({ priority: 1, population: -1 })
      .lean();

    console.log(`📊 Locations found: ${locations.length}`);
    console.log(`📅 Days to cache: ${DAYS_TO_CACHE}`);
    console.log(`📦 Total operations: ${locations.length * DAYS_TO_CACHE}`);
    console.log("=".repeat(60));

    const startDate = new Date();
    const startTime = Date.now();

    for (let i = 0; i < locations.length; i++) {
      const location = locations[i];
      const progress = (((i + 1) / locations.length) * 100).toFixed(1);

      console.log(
        `\n[${i + 1}/${locations.length}] [${progress}%] 🏙️  ${location.nameUz || location.name}`
      );
      console.log(
        `   Region: ${location.region} | Pop: ${location.population?.toLocaleString() || "N/A"}`
      );

      const result = await cacheForLocation(location, startDate);

      console.log(
        `   ✅ Complete: ${result.cached} cached | ${result.skipped} skipped | ${result.failed} failed`
      );
      console.log(
        `   📊 Total: ${stats.success} success | ${stats.duplicates} duplicates | ${stats.failed} failed`
      );

      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const avgPerLocation = elapsed / (i + 1);
      const remaining = Math.ceil(avgPerLocation * (locations.length - i - 1));
      console.log(
        `   ⏱️  Elapsed: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s | ETA: ${Math.floor(remaining / 60)}m ${remaining % 60}s`
      );
    }

    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    console.log("\n" + "=".repeat(60));
    console.log("🎉 PRE-CACHE COMPLETED!");
    console.log("=".repeat(60));
    console.log(`✅ Successfully cached: ${stats.success}`);
    console.log(`⏭️  Duplicates skipped: ${stats.duplicates}`);
    console.log(`❌ Failed: ${stats.failed}`);
    console.log(`📦 Total operations: ${stats.total}`);
    console.log(
      `⏱️  Total time: ${Math.floor(totalTime / 60)}m ${totalTime % 60}s`
    );
    console.log("=".repeat(60));

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  }
}

// Handle termination
process.on("SIGINT", async () => {
  console.log("\n\n⚠️  Process interrupted by user");
  console.log("📊 Statistics before exit:");
  console.log(`   ✅ Success: ${stats.success}`);
  console.log(`   ❌ Failed: ${stats.failed}`);
  console.log(`   ⏭️  Skipped: ${stats.duplicates}`);
  await mongoose.connection.close();
  process.exit(0);
});

preCacheAllCities();
