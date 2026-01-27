#!/usr/bin/env node
/**
 * TEST PRE-CACHE - Kichik test
 *
 * Test: 5 location × 3 days = 15 operations
 */

require("dotenv").config();
const mongoose = require("mongoose");
const axios = require("axios");
const PrayerTimeCache = require("./models/PrayerTimeCache");

// Test locations
const testLocations = [
  { name: "Toshkent", lat: 41.2995, lon: 69.2401 },
  { name: "Samarqand", lat: 39.627, lon: 66.975 },
  { name: "Buxoro", lat: 39.7747, lon: 64.4286 },
  { name: "Andijon", lat: 40.7821, lon: 72.3442 },
  { name: "Namangan", lat: 40.9983, lon: 71.6726 },
];

const DB_URL = process.env.MONGODB_URI;
const DAYS_TO_CACHE = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPrayerTimes(lat, lon, date) {
  const url = "http://api.aladhan.com/v1/timings";
  const timestamp = Math.floor(date.getTime() / 1000);

  const params = {
    latitude: lat,
    longitude: lon,
    method: 1,
    school: 1,
    timestamp,
    timezonestring: "Asia/Tashkent",
  };

  try {
    const response = await axios.get(url, { params, timeout: 10000 });
    if (response.data.code === 200) {
      const timings = response.data.data.timings;
      return {
        success: true,
        timings: {
          fajr: timings.Fajr,
          sunrise: timings.Sunrise,
          dhuhr: timings.Dhuhr,
          asr: timings.Asr,
          maghrib: timings.Maghrib,
          isha: timings.Isha,
        },
      };
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }
  return { success: false };
}

async function saveToCache(locationKey, dateStr, prayerData, lat, lon) {
  try {
    const expiresAt = new Date(dateStr);
    expiresAt.setDate(expiresAt.getDate() + 30);

    await PrayerTimeCache.findOneAndUpdate(
      { locationKey, date: dateStr },
      {
        locationKey,
        latitude: lat,
        longitude: lon,
        date: dateStr,
        timings: prayerData.timings,
        source: "test-pre-cache",
        expiresAt,
      },
      { upsert: true }
    );
    return true;
  } catch (error) {
    return false;
  }
}

async function testPreCache() {
  console.log("\n🧪 TEST PRE-CACHE");
  console.log(
    `📍 ${testLocations.length} locations × ${DAYS_TO_CACHE} days = ${testLocations.length * DAYS_TO_CACHE} operations\n`
  );

  try {
    console.log("🔗 Connecting...");
    await mongoose.connect(DB_URL);
    console.log("✅ Connected\n");

    let success = 0;
    let failed = 0;

    for (const loc of testLocations) {
      console.log(`📍 ${loc.name}:`);
      const locationKey = `${loc.lat.toFixed(4)}_${loc.lon.toFixed(4)}`;

      for (let day = 0; day < DAYS_TO_CACHE; day++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + day);
        const dateStr = targetDate.toISOString().split("T")[0];

        const prayerData = await fetchPrayerTimes(loc.lat, loc.lon, targetDate);

        if (prayerData.success) {
          const saved = await saveToCache(
            locationKey,
            dateStr,
            prayerData,
            loc.lat,
            loc.lon
          );
          if (saved) {
            success++;
            process.stdout.write(
              `   ✅ ${dateStr} | Fajr: ${prayerData.timings.fajr}\n`
            );
          } else {
            failed++;
          }
        } else {
          failed++;
          console.log(`   ❌ ${dateStr} Failed`);
        }

        await sleep(150);
      }
      console.log();
    }

    console.log(`\n📊 Result: ${success} success | ${failed} failed\n`);

    await mongoose.connection.close();
    console.log("✅ Done!\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ ERROR:", error);
    process.exit(1);
  }
}

testPreCache();
