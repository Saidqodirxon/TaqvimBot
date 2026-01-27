#!/usr/bin/env node
/**
 * Pre-cache Prayer Times for ALL Cities/Districts in Uzbekistan
 * Reduces dependency on Aladhan API
 * Run: node pre-cache-uzbekistan.js
 * Schedule: Daily at 03:00 AM via cron
 *
 * COVERAGE:
 * - 100+ locations (cities, districts, towns)
 * - 60 days forward (2 months until April)
 * - ~6000 total cache entries
 * - 95%+ user coverage
 */

require("dotenv").config();
const mongoose = require("mongoose");
const axios = require("axios");
const PrayerTimeCache = require("./models/PrayerTimeCache");

// Load FULL location list
const cities = require("./data/uzbekistan-all-locations.json");

const DB_URL = process.env.MONGODB_URI || process.env.DB_URL;

// Settings - EXTENDED for comprehensive coverage
const DAYS_TO_CACHE = 60; // 2 months (until April)
const DELAY_BETWEEN_REQUESTS = 150; // ms - faster but safe
const METHOD = 1; // Karachi University
const SCHOOL = 1; // Hanafi
const MAX_RETRIES = 3;
const BATCH_SIZE = 10; // Process in batches for better progress tracking

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch prayer times from Aladhan API
 */
async function fetchPrayerTimes(lat, lon, date, retries = 3) {
  const url = "http://api.aladhan.com/v1/timings";
  const timestamp = Math.floor(date.getTime() / 1000);

  const params = {
    latitude: lat,
    longitude: lon,
    method: METHOD,
    school: SCHOOL,
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
      console.error(
        `  ⚠️ Attempt ${attempt}/${retries} failed: ${error.message}`
      );
      if (attempt < retries) {
        await sleep(2000 * attempt); // Exponential backoff
      }
    }
  }

  return { success: false };
}

/**
 * Save to cache
 */
async function saveToCache(locationKey, dateStr, prayerData, cityName) {
  try {
    const [lat, lon] = locationKey.split("_").map(Number);

    // Set expiration to end of day + 30 days
    const expiresAt = new Date(dateStr);
    expiresAt.setHours(23, 59, 59, 999);
    expiresAt.setDate(expiresAt.getDate() + 30);

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
        method: METHOD,
        school: SCHOOL,
        midnightMode: 0,
        latitudeAdjustment: 1,
      },
      source: "pre-cache-uzbekistan",
      expiresAt,
    };

    await PrayerTimeCache.findOneAndUpdate(
      { locationKey, date: dateStr },
      cacheData,
      { upsert: true, new: true }
    );

    console.log(`    ✅ Cached: ${cityName} - ${dateStr}`);
    return true;
  } catch (error) {
    console.error(`    ❌ Cache error: ${error.message}`);
    return false;
  }
}

/**
 * Main pre-cache function
 */
async function preCacheUzbekistan() {
  console.log("🇺🇿 Pre-caching Prayer Times for Uzbekistan Cities\n");
  console.log(`📊 Cities: ${cities.length}`);
  console.log(`📅 Days: ${DAYS_TO_CACHE}`);
  console.log(`📦 Total operations: ${cities.length * DAYS_TO_CACHE}\n`);

  try {
    // Connect to database
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(DB_URL);
    console.log("✅ Connected!\n");

    const stats = {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0,
    };

    const startTime = Date.now();

    // Process each city
    for (const city of cities) {
      console.log(
        `\n📍 Processing: ${city.name} (${city.lat}, ${city.lon}) - Population: ${city.population.toLocaleString()}`
      );

      const locationKey = `${city.lat.toFixed(4)}_${city.lon.toFixed(4)}`;

      // Cache for next DAYS_TO_CACHE days
      for (let dayOffset = 0; dayOffset < DAYS_TO_CACHE; dayOffset++) {
        stats.total++;

        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + dayOffset);
        targetDate.setHours(0, 0, 0, 0);
        const dateStr = targetDate.toISOString().split("T")[0];

        // Check if already cached
        const existing = await PrayerTimeCache.findOne({
          locationKey,
          date: dateStr,
        });

        if (existing && existing.source === "pre-cache-uzbekistan") {
          // console.log(`    ⏭️  Skipped: ${city.name} - ${dateStr} (already cached)`);
          stats.skipped++;
          continue;
        }

        // Fetch from API
        const prayerData = await fetchPrayerTimes(
          city.lat,
          city.lon,
          targetDate
        );

        if (prayerData.success) {
          const saved = await saveToCache(
            locationKey,
            dateStr,
            prayerData,
            city.name
          );
          if (saved) {
            stats.success++;
          } else {
            stats.failed++;
          }
        } else {
          console.log(`    ❌ Failed to fetch: ${city.name} - ${dateStr}`);
          stats.failed++;
        }

        // Rate limiting delay
        await sleep(DELAY_BETWEEN_REQUESTS);
      }

      // Progress update
      const progress = (
        (stats.total / (cities.length * DAYS_TO_CACHE)) *
        100
      ).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(
        `\n  📊 Progress: ${stats.total}/${cities.length * DAYS_TO_CACHE} (${progress}%) | Time: ${elapsed}s | Success: ${stats.success} | Failed: ${stats.failed} | Skipped: ${stats.skipped}`
      );
    }

    // Final stats
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log("\n✅ Pre-caching completed!\n");
    console.log("📊 Final Statistics:");
    console.log(`  Total operations: ${stats.total}`);
    console.log(`  Successfully cached: ${stats.success}`);
    console.log(`  Failed: ${stats.failed}`);
    console.log(`  Skipped (already cached): ${stats.skipped}`);
    console.log(`  Total time: ${totalTime}s`);
    console.log(
      `  Average time per city: ${(totalTime / cities.length).toFixed(1)}s\n`
    );

    await mongoose.connection.close();
    console.log("🔌 Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run
preCacheUzbekistan();
