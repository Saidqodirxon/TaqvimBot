#!/usr/bin/env node
/**
 * Prayer Time Cache Auto-Refresh Scheduler
 * Cache'larni muddati tugashidan oldin yangilaydi
 */

require("dotenv").config();

// Set timezone to Uzbekistan
process.env.TZ = "Asia/Tashkent";

const schedule = require("node-schedule");
const mongoose = require("mongoose");
const PrayerTimeCache = require("./models/PrayerTimeCache");
const User = require("./models/User");
const { getPrayerTimes } = require("./utils/aladhan");

const DB_URL = process.env.MONGODB_URI || process.env.DB_URL;

/**
 * Connect to database
 */
async function connectDB() {
  try {
    await mongoose.connect(DB_URL);
    console.log("✅ Database connected for cache refresh");
  } catch (error) {
    console.error("❌ Database connection error:", error);
    throw error;
  }
}

/**
 * Refresh expiring caches
 * Eskirayotgan (24 soat ichida eskiradigan) cache'larni yangilaydi
 */
async function refreshExpiringCaches() {
  try {
    console.log("🔄 Starting cache refresh...");

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find caches expiring in next 24 hours
    const expiringCaches = await PrayerTimeCache.find({
      expiresAt: { $lt: in24Hours, $gt: now },
      source: "aladhan-api",
    })
      .limit(100)
      .lean();

    console.log(`📊 Found ${expiringCaches.length} expiring caches`);

    let refreshed = 0;
    let failed = 0;

    for (const cache of expiringCaches) {
      try {
        const { latitude, longitude, settings } = cache;

        // Fetch fresh data from API
        const freshData = await getPrayerTimes(
          latitude,
          longitude,
          settings?.method || 1,
          settings?.school || 1,
          settings?.midnightMode || 0,
          settings?.latitudeAdjustment || 1
        );

        if (freshData.success && !freshData.cached) {
          refreshed++;
          console.log(`✅ Refreshed: ${cache.locationKey} (${cache.date})`);
        }

        // Small delay to avoid API rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        console.error(
          `❌ Failed to refresh ${cache.locationKey}:`,
          error.message
        );
      }
    }

    console.log(
      `✅ Cache refresh completed: ${refreshed} refreshed, ${failed} failed`
    );
  } catch (error) {
    console.error("❌ Cache refresh error:", error);
  }
}

/**
 * Pre-cache for active users
 * Aktiv userlar uchun keyingi 3 kun uchun cache yaratadi
 */
async function preCacheForActiveUsers() {
  try {
    console.log("🔄 Starting pre-cache for active users...");

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Find users active in last 3 days
    const activeUsers = await User.find({
      last_active: { $gte: threeDaysAgo },
      "location.latitude": { $exists: true },
      "location.longitude": { $exists: true },
    })
      .select("location userId")
      .limit(500)
      .lean();

    console.log(`📊 Found ${activeUsers.length} active users`);

    const uniqueLocations = new Map();
    for (const user of activeUsers) {
      const key = `${user.location.latitude.toFixed(4)}_${user.location.longitude.toFixed(4)}`;
      if (!uniqueLocations.has(key)) {
        uniqueLocations.set(key, user.location);
      }
    }

    console.log(`📍 ${uniqueLocations.size} unique locations`);

    let cached = 0;

    for (const [key, location] of uniqueLocations) {
      try {
        // Cache for today and next 2 days
        for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + dayOffset);
          targetDate.setHours(0, 0, 0, 0);

          const dateStr = targetDate.toISOString().split("T")[0];

          // Check if already cached
          const existing = await PrayerTimeCache.findOne({
            locationKey: key,
            date: dateStr,
          });

          if (!existing) {
            try {
              await getPrayerTimes(
                location.latitude,
                location.longitude,
                location.method || 1,
                location.school || 1,
                0,
                1,
                targetDate
              );
              cached++;
            } catch (apiError) {
              // Silently skip if API fails - cache will use fallback
              console.error(`⚠️ API timeout for ${key}, skipping...`);
            }
          }

          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      } catch (error) {
        console.error(`❌ Pre-cache failed for ${key}:`, error.message);
        // Continue with next location - DO NOT throw
      }
    }

    console.log(`✅ Pre-cache completed: ${cached} new entries`);
  } catch (error) {
    console.error("❌ Pre-cache error:", error);
  }
}

/**
 * Clean expired caches older than 30 days
 */
async function cleanOldExpiredCaches() {
  try {
    console.log("🧹 Cleaning old expired caches...");

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await PrayerTimeCache.deleteMany({
      expiresAt: { $lt: thirtyDaysAgo },
    });

    console.log(`✅ Deleted ${result.deletedCount} old caches`);
  } catch (error) {
    console.error("❌ Clean caches error:", error);
  }
}

/**
 * Main scheduler
 */
async function startScheduler() {
  try {
    await connectDB();

    // Refresh expiring caches every 6 hours
    schedule.scheduleJob("0 */6 * * *", async () => {
      console.log("\n⏰ Running scheduled cache refresh...");
      await refreshExpiringCaches();
    });

    // Pre-cache for active users every 12 hours
    schedule.scheduleJob("0 */12 * * *", async () => {
      console.log("\n⏰ Running scheduled pre-cache...");
      await preCacheForActiveUsers();
    });

    // Clean old caches daily at 4 AM
    schedule.scheduleJob("0 4 * * *", async () => {
      console.log("\n⏰ Running scheduled cache cleanup...");
      await cleanOldExpiredCaches();
    });

    console.log("✅ Cache refresh scheduler started!");
    console.log("📅 Schedules:");
    console.log("  - Refresh expiring: Every 6 hours");
    console.log("  - Pre-cache users: Every 12 hours");
    console.log("  - Clean old: Daily at 4 AM");

    // Run initial refresh
    console.log("\n🚀 Running initial cache refresh...");
    await refreshExpiringCaches();
    await preCacheForActiveUsers();
  } catch (error) {
    console.error("❌ Scheduler startup error:", error);
    console.error("⚠️ Continuing bot operation despite scheduler error...");
    // DO NOT exit - bot must continue working
  }
}

// Handle shutdown
process.on("SIGINT", async () => {
  console.log("\n⏹️ Shutting down cache refresh scheduler...");
  await mongoose.connection.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n⏹️ Shutting down cache refresh scheduler...");
  await mongoose.connection.close();
  process.exit(0);
});

// Run if called directly
if (require.main === module) {
  startScheduler().catch((error) => {
    console.error("💥 Fatal error:", error);
    console.error("⚠️ Continuing bot operation despite fatal error...");
    // DO NOT exit - bot must continue working
  });
}

module.exports = {
  startScheduler,
  refreshExpiringCaches,
  preCacheForActiveUsers,
};
