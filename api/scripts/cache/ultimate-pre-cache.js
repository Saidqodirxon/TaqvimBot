const mongoose = require("mongoose");
require("dotenv").config();
const PrayerTimeCache = require("./models/PrayerTimeCache");
const Location = require("./models/Location");
const { getPrayerTimes } = require("./utils/aladhan");
const fs = require("fs");
const path = require("path");

// Configuration - LONG RUNNING PROCESS
const DAYS_FORWARD = 60; // 2 months
const DELAY_BETWEEN_REQUESTS = 300; // 300ms to avoid rate limits
const SAVE_CHECKPOINT_EVERY = 50; // Save progress every 50 successful caches
const ERROR_REPORT_FILE = path.join(__dirname, "cache-errors-report.md");

let totalStats = {
  successCount: 0,
  skippedCount: 0,
  failedCount: 0,
  processedLocations: 0,
  totalLocations: 0,
  startTime: new Date(),
};

let errorLog = [];

function logError(location, date, error) {
  const entry = {
    location: `${location.nameUz} (${location.nameRu})`,
    coordinates: `${location.latitude}, ${location.longitude}`,
    date,
    error: error.toString(),
    timestamp: new Date().toISOString(),
  };
  errorLog.push(entry);
}

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

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function saveCheckpoint() {
  const checkpointPath = path.join(__dirname, "cache-progress.json");
  fs.writeFileSync(checkpointPath, JSON.stringify(totalStats, null, 2));
}

async function checkExistingCache(latitude, longitude, date) {
  const locationKey = `${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
  const cache = await PrayerTimeCache.findOne({
    locationKey,
    date: getDateString(date),
  })
    .select("timings")
    .lean();

  // Validate cache - must have timings and all required prayers
  if (!cache) return false;

  if (!cache.timings) return false;

  const requiredPrayers = [
    "Fajr",
    "Sunrise",
    "Dhuhr",
    "Asr",
    "Maghrib",
    "Isha",
  ];
  for (const prayer of requiredPrayers) {
    if (!cache.timings[prayer]) {
      return false; // Invalid cache - missing prayer time
    }
  }

  return true; // Valid cache exists
}

// Check if location already has full cache coverage
async function locationFullyCached(
  latitude,
  longitude,
  startDate,
  daysForward
) {
  const locationKey = `${latitude.toFixed(4)}_${longitude.toFixed(4)}`;

  // Calculate end date
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + daysForward - 1);

  // Get all cached dates for this location in the range
  const cachedEntries = await PrayerTimeCache.find({
    locationKey,
    date: {
      $gte: getDateString(startDate),
      $lte: getDateString(endDate),
    },
  })
    .select("date timings")
    .lean();

  // Validate each entry has all 6 prayer times
  const validEntries = cachedEntries.filter((entry) => {
    if (!entry.timings) return false;
    const requiredPrayers = [
      "Fajr",
      "Sunrise",
      "Dhuhr",
      "Asr",
      "Maghrib",
      "Isha",
    ];
    return requiredPrayers.every((prayer) => entry.timings[prayer]);
  });

  // Location is fully cached if we have all days with valid data
  return validEntries.length >= daysForward;
}

async function cacheLocationForDates(location, startDate, daysForward) {
  const { nameUz, nameRu, latitude, longitude, region, population } = location;

  if (!latitude || !longitude) {
    console.log(`⚠️  Skipping ${nameUz} - missing coordinates\n`);
    return {
      location: nameUz,
      successCount: 0,
      skippedCount: 0,
      failedCount: 0,
    };
  }

  // Check if location is already fully cached
  const fullyCached = await locationFullyCached(
    latitude,
    longitude,
    startDate,
    daysForward
  );
  if (fullyCached) {
    console.log(
      `✅ ${nameUz} - Already fully cached (${daysForward} days), skipping\n`
    );
    totalStats.skippedCount += daysForward;
    return {
      location: nameUz,
      successCount: 0,
      skippedCount: daysForward,
      failedCount: 0,
    };
  }

  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  console.log(`\n${"═".repeat(70)}`);
  console.log(`📍 ${nameUz} (${nameRu})`);
  console.log(
    `📌 Region: ${region || "N/A"} | 👥 Pop: ${population?.toLocaleString() || "N/A"}`
  );
  console.log(`🌍 Coordinates: ${latitude}, ${longitude}`);
  console.log(
    `📅 Caching ${daysForward} days forward (${DAYS_FORWARD} total)...`
  );
  console.log("═".repeat(70));

  for (let i = 0; i < daysForward; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const dateStr = getDateString(currentDate);

    // Check if already cached
    const exists = await checkExistingCache(latitude, longitude, currentDate);
    if (exists) {
      skippedCount++;
      totalStats.skippedCount++;
      continue;
    }

    try {
      // Get prayer times with MWL method and Hanafi school
      const result = await getPrayerTimes(
        latitude,
        longitude,
        3, // MWL - Muslim World League
        1, // Hanafi madhab
        0, // Standard midnight mode
        1, // Latitude adjustment for Uzbekistan
        currentDate
      );

      if (result.success) {
        successCount++;
        totalStats.successCount++;

        // Progress indicator every 10 days
        if ((i + 1) % 10 === 0 || i === daysForward - 1) {
          const progress = (((i + 1) / daysForward) * 100).toFixed(1);
          console.log(
            `  [${"█".repeat(Math.floor(progress / 5))}${" ".repeat(20 - Math.floor(progress / 5))}] ${progress}% | ${i + 1}/${daysForward} days | ✅ ${successCount} new, ⏭️  ${skippedCount} cached`
          );
        }

        // Save checkpoint every 50 successes
        if (totalStats.successCount % SAVE_CHECKPOINT_EVERY === 0) {
          saveCheckpoint();
        }
      } else {
        failedCount++;
        totalStats.failedCount++;
        console.log(
          `  ❌ [${i + 1}/${daysForward}] ${dateStr} - FAILED: ${result.error}`
        );
        logError(location, dateStr, result.error || "Unknown error");

        // If API error, wait longer before retry
        if (result.error?.includes("API") || result.error?.includes("429")) {
          console.log(`  ⏸️  API rate limit detected, waiting 5 seconds...`);
          await delay(5000);
        }
      }

      // Standard delay between requests
      await delay(DELAY_BETWEEN_REQUESTS);
    } catch (error) {
      failedCount++;
      totalStats.failedCount++;
      console.log(
        `  ❌ [${i + 1}/${daysForward}] ${dateStr} - ERROR: ${error.message}`
      );
      logError(location, dateStr, error.message);
      await delay(DELAY_BETWEEN_REQUESTS * 2); // Double delay on error
    }
  }

  console.log(
    `\n✅ ${nameUz}: ${successCount} new, ${skippedCount} skipped, ${failedCount} failed`
  );

  return { location: nameUz, successCount, skippedCount, failedCount };
}

async function ultimatePreCache() {
  try {
    console.log("\n" + "█".repeat(70));
    console.log("🚀 ULTIMATE PRE-CACHE SYSTEM - O'ZBEKISTON");
    console.log("█".repeat(70));
    console.log(`📅 Target: ${DAYS_FORWARD} days forward (2 months)`);
    console.log(`⏱️  Delay: ${DELAY_BETWEEN_REQUESTS}ms between requests`);
    console.log(`📊 Method: MWL (Muslim World League) - Method 3`);
    console.log(`🕌 School: Hanafi Madhab - School 1`);
    console.log(
      `💾 Checkpoints: Every ${SAVE_CHECKPOINT_EVERY} successful caches`
    );
    console.log(`📝 Error logging: Enabled (cache-errors-report.md)`);
    console.log(`✅ Cache validation: Enabled (checks all 6 prayer times)`);
    console.log("█".repeat(70) + "\n");

    // Connect with retry logic and better timeout settings
    const connectOptions = {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 30000, // 30 seconds
      retryWrites: true,
      retryReads: true,
      maxPoolSize: 10,
      minPoolSize: 2,
    };

    let connected = false;
    let retries = 0;
    const maxRetries = 3;

    while (!connected && retries < maxRetries) {
      try {
        await mongoose.connect(process.env.MONGODB_URI, connectOptions);
        console.log("✅ MongoDB connected\n");
        connected = true;
      } catch (error) {
        retries++;
        console.log(`❌ Connection attempt ${retries}/${maxRetries} failed`);
        if (retries < maxRetries) {
          console.log(`⏳ Retrying in 5 seconds...\n`);
          await delay(5000);
        } else {
          console.log(
            `\n❌ Failed to connect to MongoDB after ${maxRetries} attempts`
          );
          console.log(
            "Please check your internet connection and MongoDB Atlas status"
          );
          throw error;
        }
      }
    }

    // Get all active locations sorted by priority and population
    const allLocations = await Location.find({ isActive: true })
      .sort({ priority: -1, population: -1 })
      .lean();

    // Filter locations with valid coordinates
    const locations = allLocations.filter(
      (loc) => loc.latitude && loc.longitude
    );

    totalStats.totalLocations = locations.length;

    console.log(`🏙️  Found ${allLocations.length} active locations`);
    console.log(`✅ ${locations.length} locations with valid coordinates\n`);

    if (allLocations.length > locations.length) {
      console.log(
        `⚠️  Warning: ${allLocations.length - locations.length} locations skipped due to missing coordinates\n`
      );
    }

    if (locations.length === 0) {
      console.log("⚠️  No valid locations found. Please import cities first.");
      console.log("Run: node import-extended-cities.js");
      process.exit(0);
    }

    // Calculate estimated time
    const estimatedRequestsPerLocation = DAYS_FORWARD * 0.7; // 70% will be new (30% cached)
    const estimatedTotalRequests =
      locations.length * estimatedRequestsPerLocation;
    const estimatedTimeMs =
      estimatedTotalRequests * (DELAY_BETWEEN_REQUESTS + 200); // +200ms for API response
    console.log(`⏰ Estimated time: ${formatDuration(estimatedTimeMs)}`);
    console.log(
      `📡 Estimated requests: ~${Math.round(estimatedTotalRequests)}\n`
    );

    console.log("🔥 Starting in 3 seconds... (CTRL+C to cancel)\n");
    await delay(3000);

    const startDate = new Date();
    const results = [];

    // Process each location sequentially
    for (const location of locations) {
      totalStats.processedLocations++;
      const processed = totalStats.processedLocations;
      const total = totalStats.totalLocations;
      const percent = ((processed / total) * 100).toFixed(1);

      // Progress bar
      const barLength = 50;
      const filledLength = Math.floor((processed / total) * barLength);
      const bar =
        "█".repeat(filledLength) + "▒".repeat(barLength - filledLength);

      console.log(`\n[${bar}] ${percent}% | ${processed}/${total} locations`);

      // Time statistics
      const elapsed = Date.now() - totalStats.startTime;
      const avgTimePerLocation = elapsed / processed;
      const remaining = (total - processed) * avgTimePerLocation;

      console.log(
        `⏱️  Elapsed: ${formatDuration(elapsed)} | Remaining: ~${formatDuration(remaining)}`
      );
      console.log(
        `📊 Total: ✅ ${totalStats.successCount} new | ⏭️  ${totalStats.skippedCount} cached | ❌ ${totalStats.failedCount} failed`
      );

      const result = await cacheLocationForDates(
        location,
        startDate,
        DAYS_FORWARD
      );
      results.push(result);

      // Small delay between locations
      await delay(500);
    }

    // Final summary
    const totalTime = Date.now() - totalStats.startTime;

    console.log("\n" + "█".repeat(70));
    console.log("🎉 ULTIMATE PRE-CACHE COMPLETED");
    console.log("█".repeat(70));
    console.log(`📍 Locations processed: ${locations.length}`);
    console.log(`✅ New cache entries: ${totalStats.successCount}`);
    console.log(`⏭️  Skipped (existing): ${totalStats.skippedCount}`);
    console.log(`❌ Failed: ${totalStats.failedCount}`);
    console.log(
      `📊 Total cache entries: ${totalStats.successCount + totalStats.skippedCount}`
    );
    console.log(`📅 Days per location: ${DAYS_FORWARD}`);
    console.log(`⏱️  Total time: ${formatDuration(totalTime)}`);
    console.log(
      `⚡ Avg per location: ${formatDuration(totalTime / locations.length)}`
    );
    console.log("█".repeat(70));

    // Save final checkpoint
    saveCheckpoint();
    console.log("\n💾 Final progress saved to cache-progress.json");
    // Generate error report if there are errors
    if (errorLog.length > 0) {
      let errorReport = `# Cache Errors Report\n\n`;
      errorReport += `**Generated**: ${new Date().toLocaleString("uz-UZ")}\n`;
      errorReport += `**Total Errors**: ${errorLog.length}\n\n`;
      errorReport += `---\n\n`;

      // Group errors by location
      const errorsByLocation = {};
      errorLog.forEach((err) => {
        if (!errorsByLocation[err.location]) {
          errorsByLocation[err.location] = [];
        }
        errorsByLocation[err.location].push(err);
      });

      errorReport += `## Errors by Location\n\n`;
      Object.keys(errorsByLocation).forEach((location) => {
        const errors = errorsByLocation[location];
        errorReport += `### ${location}\n`;
        errorReport += `**Coordinates**: ${errors[0].coordinates}\n`;
        errorReport += `**Error Count**: ${errors.length}\n\n`;
        errorReport += `| Date | Error | Time |\n`;
        errorReport += `|------|-------|------|\n`;
        errors.forEach((err) => {
          errorReport += `| ${err.date} | ${err.error} | ${new Date(err.timestamp).toLocaleTimeString("uz-UZ")} |\n`;
        });
        errorReport += `\n`;
      });

      fs.writeFileSync(ERROR_REPORT_FILE, errorReport);
      console.log(`\n📝 Error report saved to cache-errors-report.md`);
      console.log(
        `⚠️  ${errorLog.length} errors logged across ${Object.keys(errorsByLocation).length} locations`
      );
    } else {
      console.log("\n✅ No errors detected - all cache operations successful!");
    }
    // Top performing locations
    console.log("\n🏆 Top 10 locations by new cache entries:");
    results
      .sort((a, b) => b.successCount - a.successCount)
      .slice(0, 10)
      .forEach((r, i) => {
        console.log(`${i + 1}. ${r.location}: ${r.successCount} new entries`);
      });

    // Locations with most failures
    const failedLocations = results.filter((r) => r.failedCount > 0);
    if (failedLocations.length > 0) {
      console.log("\n⚠️  Locations with failures:");
      failedLocations
        .sort((a, b) => b.failedCount - a.failedCount)
        .slice(0, 10)
        .forEach((r) => {
          console.log(`- ${r.location}: ${r.failedCount} failures`);
        });
    }

    mongoose.connection.close();
    console.log("\n✅ Database connection closed");
    console.log("✨ All done! Bot is now turbo-charged for 90 days! 🚀\n");
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    saveCheckpoint();
    process.exit(1);
  }
}

// Handle interruption gracefully
process.on("SIGINT", async () => {
  console.log("\n\n⚠️  Process interrupted by user");
  console.log("💾 Saving progress...");
  saveCheckpoint();
  console.log("✅ Progress saved to cache-progress.json");
  console.log(
    "📊 You can run this script again to continue from where it stopped."
  );
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(0);
});

ultimatePreCache();
