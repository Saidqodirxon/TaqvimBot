#!/usr/bin/env node

/**
 * Add missing prayer data for locations with no data
 * Fetches from Aladhan API and caches in database
 */

const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const Location = require("./models/Location");
const PrayerTimeData = require("./models/PrayerTimeData");

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPrayerTimesFromAPI(
  latitude,
  longitude,
  date,
  method = 3,
  school = 1
) {
  try {
    const dateStr = date.toISOString().split("T")[0];
    const url = `https://api.aladhan.com/v1/timings/${dateStr}`;

    const response = await axios.get(url, {
      params: {
        latitude,
        longitude,
        method,
        school,
        midnightMode: 0,
        latitudeAdjustmentMethod: 1,
      },
      timeout: 10000,
    });

    if (response.data?.data?.timings) {
      const timings = response.data.data.timings;
      // Return with CAPITALIZED keys to match PrayerTimeData schema
      return {
        Fajr: timings.Fajr,
        Sunrise: timings.Sunrise,
        Dhuhr: timings.Dhuhr,
        Asr: timings.Asr,
        Maghrib: timings.Maghrib,
        Isha: timings.Isha,
        Midnight: timings.Midnight,
        Imsak: timings.Imsak,
        Sunset: timings.Sunset,
        Firstthird: timings.Firstthird,
        Lastthird: timings.Lastthird,
      };
    }
    return null;
  } catch (error) {
    console.error(`API Error for ${latitude}, ${longitude}:`, error.message);
    return null;
  }
}

async function addMissingPrayerData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Read report
    const fs = require("fs");
    const reportPath = "./location-analysis-report.json";

    if (!fs.existsSync(reportPath)) {
      console.log("❌ Report not found. Run analyze-locations.js first.");
      process.exit(1);
    }

    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

    // Combine locations with NO data and LOW data (<50%)
    const locationsToFix = [...report.noPrayerData, ...report.lowData];

    if (locationsToFix.length === 0) {
      console.log("✅ No locations need prayer data. All good!");
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(
      `📊 Found ${report.noPrayerData.length} locations with NO data`
    );
    console.log(
      `📊 Found ${report.lowData.length} locations with LOW data (<50%)`
    );
    console.log(`📊 Total to fix: ${locationsToFix.length} locations\n`);
    console.log("🚀 Starting to fetch prayer times...\n");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < locationsToFix.length; i++) {
      const location = locationsToFix[i];
      console.log(
        `[${i + 1}/${locationsToFix.length}] Processing: ${location.name}`
      );
      console.log(`   Coordinates: ${location.lat}, ${location.lng}`);
      console.log(`   Users: ${location.users}`);

      // Fetch for next 60 days
      for (let day = 0; day < 60; day++) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + day);
        const dateStr = targetDate.toISOString().split("T")[0];

        // Check if already exists
        const exists = await PrayerTimeData.findOne({
          locationKey: location.locationKey,
          date: dateStr,
        });

        if (exists) {
          continue; // Skip if already exists
        }

        // Fetch from API
        const timings = await fetchPrayerTimesFromAPI(
          location.lat,
          location.lng,
          targetDate,
          3, // MWL method
          1 // Hanafi school
        );

        if (timings) {
          // Save to database with required cityName field
          await PrayerTimeData.create({
            locationKey: location.locationKey,
            cityName: location.name, // Required field
            cityNameUz: location.nameUz || location.name,
            cityNameRu: location.nameRu,
            latitude: location.lat,
            longitude: location.lng,
            date: dateStr,
            timings,
            method: 3,
            school: 1,
          });
        } else {
          errorCount++;
          console.log(`   ⚠️  Failed to fetch for ${dateStr}`);
        }

        // Rate limiting - 1 request per second
        await sleep(1000);
      }

      successCount++;
      console.log(
        `   ✅ Completed (${successCount}/${locationsToFix.length})\n`
      );
    }

    console.log("=".repeat(80));
    console.log("📊 SUMMARY");
    console.log("=".repeat(80));
    console.log(`✅ Processed: ${successCount} locations`);
    console.log(`⚠️  Errors: ${errorCount} API calls`);
    console.log("");
    console.log("🎉 Done! Run analyze-locations.js again to verify.");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addMissingPrayerData();
