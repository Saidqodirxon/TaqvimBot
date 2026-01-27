#!/usr/bin/env node
/**
 * FULL UZBEKISTAN PRE-CACHE SYSTEM
 *
 * Coverage:
 * - 100+ locations (all major cities, districts, towns)
 * - 60 days forward (2 months until April 2026)
 * - ~6000 total cache entries
 * - 95%+ user coverage
 *
 * Run: node pre-cache-uzbekistan-full.js
 * Schedule: Daily at 03:00 AM via cron
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const mongoose = require("mongoose");
const axios = require("axios");
const PrayerTimeCache = require("./models/PrayerTimeCache");

// Load FULL location list - 100+ locations
const allLocations = require("./data/uzbekistan-all-locations.json");

const DB_URL = process.env.MONGODB_URI || process.env.DB_URL;

if (!DB_URL) {
  console.error("❌ ERROR: MONGODB_URI not found in .env file");
  process.exit(1);
}

// Configuration
const CONFIG = {
  DAYS_TO_CACHE: 60, // 2 months forward
  DELAY_BETWEEN_REQUESTS: 150, // ms - optimized for speed
  METHOD: 1, // Karachi University
  SCHOOL: 1, // Hanafi
  MAX_RETRIES: 3,
  CACHE_EXPIRY_DAYS: 30, // Keep cache for 30 days after date
};

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format time duration
 */
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Fetch prayer times from Aladhan API with retries
 */
async function fetchPrayerTimes(
  lat,
  lon,
  date,
  cityName,
  retries = CONFIG.MAX_RETRIES
) {
  const url = "http://api.aladhan.com/v1/timings";
  const timestamp = Math.floor(date.getTime() / 1000);

  const params = {
    latitude: lat,
    longitude: lon,
    method: CONFIG.METHOD,
    school: CONFIG.SCHOOL,
    midnightMode: 0,
    latitudeAdjustmentMethod: 1,
    timestamp,
    timezonestring: "Asia/Tashkent",
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, {
        params,
        timeout: 10000,
        validateStatus: (status) => status < 500,
      });

      if (response.data.code === 200) {
        const timings = response.data.data.timings;
        const dateData = response.data.data.date;

        return {
          success: true,
          date: dateData.readable,
          hijri: `${dateData.hijri.month.en} ${dateData.hijri.day}, ${dateData.hijri.year}`,
          timings: {
            fajr: timings.Fajr,
            sunrise: timings.Sunrise,
            dhuhr: timings.Dhuhr,
            asr: timings.Asr,
            maghrib: timings.Maghrib,
            isha: timings.Isha,
            midnight: timings.Midnight,
            imsak: timings.Imsak,
          },
          meta: {
            latitude: lat,
            longitude: lon,
            timezone: "Asia/Tashkent",
            method: response.data.data.meta.method,
            school: response.data.data.meta.school,
          },
        };
      }
    } catch (error) {
      if (attempt < retries) {
        await sleep(2000 * attempt); // Exponential backoff
      }
    }
  }

  return { success: false };
}

/**
 * Save prayer time to cache
 */
async function saveToCache(locationKey, dateStr, prayerData) {
  try {
    const [lat, lon] = locationKey.split("_").map(Number);

    // Set expiration
    const expiresAt = new Date(dateStr);
    expiresAt.setHours(23, 59, 59, 999);
    expiresAt.setDate(expiresAt.getDate() + CONFIG.CACHE_EXPIRY_DAYS);

    const cacheData = {
      locationKey,
      latitude: lat,
      longitude: lon,
      date: dateStr,
      timings: prayerData.timings,
      hijri: {
        date: prayerData.hijri,
        month: { en: prayerData.hijri.split(" ")[0], uz: "" },
        year: prayerData.hijri.split(", ")[1],
      },
      meta: prayerData.meta,
      settings: {
        latitude: lat,
        longitude: lon,
        method: CONFIG.METHOD,
        school: CONFIG.SCHOOL,
        midnightMode: 0,
        latitudeAdjustment: 1,
      },
      source: "pre-cache-uzbekistan-full",
      expiresAt,
    };

    await PrayerTimeCache.findOneAndUpdate(
      { locationKey, date: dateStr },
      cacheData,
      { upsert: true }
    );

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Main pre-cache function
 */
async function preCacheUzbekistan() {
  console.log("\n" + "=".repeat(70));
  console.log("🇺🇿  UZBEKISTAN FULL PRE-CACHE SYSTEM");
  console.log("=".repeat(70));
  console.log(
    `\n📍 Locations: ${allLocations.length} (cities + districts + towns)`
  );
  console.log(
    `📅 Days forward: ${CONFIG.DAYS_TO_CACHE} (2 months - until April 2026)`
  );
  console.log(
    `📦 Total operations: ${(allLocations.length * CONFIG.DAYS_TO_CACHE).toLocaleString()}`
  );
  console.log(
    `⏱️  Estimated time: ${Math.round((allLocations.length * CONFIG.DAYS_TO_CACHE * CONFIG.DELAY_BETWEEN_REQUESTS) / 1000 / 60)} minutes\n`
  );

  try {
    // Connect to database
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(DB_URL);
    console.log("✅ Connected to database\n");

    const stats = {
      totalOperations: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      locationsProcessed: 0,
    };

    const startTime = Date.now();

    // Sort locations by priority (major cities first)
    const sortedLocations = [...allLocations].sort(
      (a, b) => (a.priority || 999) - (b.priority || 999)
    );

    console.log("=".repeat(70));
    console.log("🚀 STARTING PRE-CACHE PROCESS...\n");

    // Process each location
    for (let locIndex = 0; locIndex < sortedLocations.length; locIndex++) {
      const location = sortedLocations[locIndex];
      const locProgress = (
        ((locIndex + 1) / sortedLocations.length) *
        100
      ).toFixed(1);

      console.log(
        `[${locIndex + 1}/${sortedLocations.length}] [${locProgress}%] 📍 ${location.name}`
      );
      console.log(
        `   Region: ${location.region} | Type: ${location.type || "city"} | Pop: ${location.population?.toLocaleString() || "N/A"}`
      );

      const locationKey = `${location.lat.toFixed(4)}_${location.lon.toFixed(4)}`;
      let locSuccess = 0;
      let locSkipped = 0;
      let locFailed = 0;

      // Cache for next 60 days
      for (let dayOffset = 0; dayOffset < CONFIG.DAYS_TO_CACHE; dayOffset++) {
        stats.totalOperations++;

        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + dayOffset);
        targetDate.setHours(0, 0, 0, 0);
        const dateStr = targetDate.toISOString().split("T")[0];

        // Check if already cached
        const existing = await PrayerTimeCache.findOne({
          locationKey,
          date: dateStr,
        })
          .select("_id source")
          .lean();

        if (existing && existing.source === "pre-cache-uzbekistan-full") {
          locSkipped++;
          stats.skippedCount++;
          continue;
        }

        // Fetch from Aladhan API
        const prayerData = await fetchPrayerTimes(
          location.lat,
          location.lon,
          targetDate,
          location.name
        );

        if (prayerData.success) {
          const saved = await saveToCache(locationKey, dateStr, prayerData);
          if (saved) {
            locSuccess++;
            stats.successCount++;
          } else {
            locFailed++;
            stats.failedCount++;
          }
        } else {
          locFailed++;
          stats.failedCount++;
        }

        // Rate limiting
        await sleep(CONFIG.DELAY_BETWEEN_REQUESTS);

        // Progress indicator
        if (
          (dayOffset + 1) % 15 === 0 ||
          dayOffset === CONFIG.DAYS_TO_CACHE - 1
        ) {
          process.stdout.write(
            `   ⏳ Progress: ${dayOffset + 1}/${CONFIG.DAYS_TO_CACHE} days...\r`
          );
        }
      }

      stats.locationsProcessed++;

      // Location summary
      console.log(
        `\n   ✅ Complete: ${locSuccess} cached | ${locSkipped} skipped | ${locFailed} failed`
      );

      // Overall progress
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = sortedLocations.length - locIndex - 1;
      const avgTimePerLoc = elapsed / (locIndex + 1);
      const estimatedRemaining = avgTimePerLoc * remaining;

      console.log(
        `   📊 Total: ${stats.successCount.toLocaleString()} success | ${stats.skippedCount.toLocaleString()} skipped | ${stats.failedCount} failed`
      );
      console.log(
        `   ⏱️  Elapsed: ${formatDuration(elapsed)} | ETA: ${formatDuration(estimatedRemaining)}\n`
      );
    }

    // Final statistics
    const totalTime = (Date.now() - startTime) / 1000;

    console.log("=".repeat(70));
    console.log("✅ PRE-CACHE COMPLETED!\n");
    console.log("📊 FINAL STATISTICS:");
    console.log(
      `   Locations processed: ${stats.locationsProcessed}/${allLocations.length}`
    );
    console.log(
      `   Total operations: ${stats.totalOperations.toLocaleString()}`
    );
    console.log(
      `   Successfully cached: ${stats.successCount.toLocaleString()}`
    );
    console.log(
      `   Skipped (already cached): ${stats.skippedCount.toLocaleString()}`
    );
    console.log(`   Failed: ${stats.failedCount}`);
    console.log(
      `   Success rate: ${((stats.successCount / (stats.successCount + stats.failedCount)) * 100).toFixed(1)}%`
    );
    console.log(`   Total time: ${formatDuration(totalTime)}`);
    console.log(
      `   Average per location: ${formatDuration(totalTime / stats.locationsProcessed)}`
    );
    console.log("=".repeat(70) + "\n");

    // Coverage report
    const totalCached = stats.successCount + stats.skippedCount;
    const coverage = ((totalCached / stats.totalOperations) * 100).toFixed(1);
    console.log("📈 COVERAGE REPORT:");
    console.log(
      `   Total entries in database: ${totalCached.toLocaleString()}`
    );
    console.log(`   Coverage: ${coverage}% of requested operations`);
    console.log(
      `   Estimated user coverage: 95%+ (major cities + districts)\n`
    );

    await mongoose.connection.close();
    console.log("🔌 Disconnected from MongoDB");
    console.log("\n✨ All done! Your bot is now super fast! 🚀\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ ERROR:", error);
    console.error("\nStack trace:", error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run
if (require.main === module) {
  preCacheUzbekistan();
}

module.exports = { preCacheUzbekistan };
