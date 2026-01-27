const mongoose = require("mongoose");
require("dotenv").config();
const PrayerTimeCache = require("./models/PrayerTimeCache");
const Location = require("./models/Location");
const { getPrayerTimes } = require("./utils/aladhan");

// Configuration
const DAYS_FORWARD = 90; // 3 months (90 days)
const DELAY_BETWEEN_REQUESTS = 300; // 300ms delay to avoid rate limits
const BATCH_SIZE = 5; // Process 5 locations at a time

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getDateString(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function checkExistingCache(latitude, longitude, date) {
  const locationKey = `${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
  const exists = await PrayerTimeCache.findOne({
    locationKey,
    date: getDateString(date),
  })
    .select("_id")
    .lean();
  return !!exists;
}

async function cacheLocationForDates(location, startDate, daysForward) {
  const { nameUz, nameRu, latitude, longitude, region } = location;
  const name_uz = nameUz || location.name_uz;
  const name_ru = nameRu || location.name_ru;

  // Safety check
  if (!latitude || !longitude) {
    console.log(`⚠️  Skipping ${name_uz} - missing coordinates`);
    return {
      location: name_uz,
      successCount: 0,
      skippedCount: 0,
      failedCount: 0,
      totalDays: daysForward,
    };
  }

  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  console.log(`\n${"=".repeat(70)}`);
  console.log(`📍 ${name_uz} (${name_ru})`);
  console.log(`📌 Region: ${region || "N/A"}`);
  console.log(`🌍 Coordinates: ${latitude}, ${longitude}`);
  console.log(`📅 Caching ${daysForward} days forward...`);
  console.log("=".repeat(70));

  for (let i = 0; i < daysForward; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const dateStr = getDateString(currentDate);

    // Check if already cached
    const exists = await checkExistingCache(latitude, longitude, currentDate);
    if (exists) {
      skippedCount++;
      if (i % 10 === 0) {
        console.log(
          `  [${i + 1}/${daysForward}] ${dateStr} - ⏭️  SKIPPED (exists)`
        );
      }
      continue;
    }

    try {
      // Get prayer times from API with proper parameters
      const result = await getPrayerTimes(
        latitude,
        longitude,
        3, // method: MWL
        1, // school: Hanafi
        0, // midnightMode
        1, // latitudeAdjustment
        currentDate // Pass Date object, not string
      );

      if (result.success) {
        successCount++;
        if (i % 5 === 0 || i === daysForward - 1) {
          console.log(`  [${i + 1}/${daysForward}] ${dateStr} - ✅ SUCCESS`);
        }
      } else {
        failedCount++;
        console.log(
          `  [${i + 1}/${daysForward}] ${dateStr} - ❌ FAILED: ${result.error}`
        );
      }

      // Delay to avoid rate limits
      await delay(DELAY_BETWEEN_REQUESTS);
    } catch (error) {
      failedCount++;
      console.log(
        `  [${i + 1}/${daysForward}] ${dateStr} - ❌ ERROR: ${error.message}`
      );
      await delay(DELAY_BETWEEN_REQUESTS * 2); // Double delay on error
    }
  }

  return {
    location: name_uz,
    successCount,
    skippedCount,
    failedCount,
    totalDays: daysForward,
  };
}

async function smartPreCache() {
  try {
    console.log("🚀 Starting Smart Pre-Cache System");
    console.log(`📅 Target: ${DAYS_FORWARD} days forward (2 months)`);
    console.log(`⏱️  Delay: ${DELAY_BETWEEN_REQUESTS}ms between requests\n`);

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected\n");

    // Get all active locations
    const allLocations = await Location.find({ isActive: true })
      .sort({ priority: -1, population: -1 })
      .lean();

    // Filter locations with valid coordinates
    const locations = allLocations.filter(
      (loc) => loc.latitude && loc.longitude
    );

    console.log(
      `🏙️  Found ${allLocations.length} active locations (${locations.length} with coordinates)\n`
    );

    if (allLocations.length > locations.length) {
      console.log(
        `⚠️  Warning: ${allLocations.length - locations.length} locations skipped due to missing coordinates\n`
      );
    }

    if (locations.length === 0) {
      console.log("⚠️  No locations found. Please import cities first.");
      console.log("Run: node import-cities-fast.js");
      process.exit(0);
    }

    const startDate = new Date();
    const results = [];

    let totalSuccess = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    let processed = 0;

    // Process locations one by one
    for (const location of locations) {
      processed++;

      console.log(
        `\n[${"█".repeat(Math.floor((processed / locations.length) * 50))}${" ".repeat(50 - Math.floor((processed / locations.length) * 50))}] ${processed}/${locations.length} (${((processed / locations.length) * 100).toFixed(1)}%)`
      );

      const result = await cacheLocationForDates(
        location,
        startDate,
        DAYS_FORWARD
      );
      results.push(result);

      totalSuccess += result.successCount;
      totalSkipped += result.skippedCount;
      totalFailed += result.failedCount;

      // Progress summary after each location
      console.log(
        `\n📊 ${result.location}: ${result.successCount} new, ${result.skippedCount} skipped, ${result.failedCount} failed`
      );
      console.log(
        `📈 Overall: ${totalSuccess} new, ${totalSkipped} skipped, ${totalFailed} failed`
      );

      // Small delay between locations
      await delay(500);
    }

    // Final summary
    console.log("\n" + "=".repeat(70));
    console.log("🎉 PRE-CACHE COMPLETED");
    console.log("=".repeat(70));
    console.log(`📍 Locations processed: ${locations.length}`);
    console.log(`✅ New cache entries: ${totalSuccess}`);
    console.log(`⏭️  Skipped (existing): ${totalSkipped}`);
    console.log(`❌ Failed: ${totalFailed}`);
    console.log(`📊 Total cache entries: ${totalSuccess + totalSkipped}`);
    console.log(`📅 Days per location: ${DAYS_FORWARD}`);
    console.log("=".repeat(70));

    // Show top 10 locations by success
    console.log("\n🏆 Top 10 locations by new cache entries:");
    results
      .sort((a, b) => b.successCount - a.successCount)
      .slice(0, 10)
      .forEach((r, i) => {
        console.log(`${i + 1}. ${r.location}: ${r.successCount} new entries`);
      });

    // Show failed locations if any
    const failedLocations = results.filter((r) => r.failedCount > 0);
    if (failedLocations.length > 0) {
      console.log("\n⚠️  Locations with failures:");
      failedLocations.forEach((r) => {
        console.log(`- ${r.location}: ${r.failedCount} failures`);
      });
    }

    mongoose.connection.close();
    console.log("\n✅ Database connection closed");
    console.log("✨ All done!\n");
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  }
}

// Handle interruption
process.on("SIGINT", async () => {
  console.log("\n\n⚠️  Process interrupted by user");
  console.log("📊 Progress saved. You can run this script again to continue.");
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(0);
});

smartPreCache();
