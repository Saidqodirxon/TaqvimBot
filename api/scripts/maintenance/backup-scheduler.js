#!/usr/bin/env node
/**
 * Automatic Backup Scheduler
 * Har kuni belgilangan vaqtda avtomatik backup yaratadi
 */

require("dotenv").config();

// Set timezone to Uzbekistan
process.env.TZ = "Asia/Tashkent";

const cron = require("node-cron");
const { createBackup } = require("./backup-mongodb");
const Settings = require("../../models/Settings");
const logger = require("../../utils/logger");
const moment = require("moment-timezone");

let scheduledTask = null;

async function initScheduler() {
  try {
    console.log("🔄 Initializing backup scheduler...");

    // Get schedule settings from database
    const settings = await Settings.findOne();
    const schedule = settings?.backupSchedule || {
      enabled: true,
      cronTime: "0 3 * * *", // Daily at 3:00 AM
      keepDays: 7,
    };

    if (!schedule.enabled) {
      console.log("⚠️ Backup scheduler is disabled");
      return;
    }

    // Validate cron expression
    if (!cron.validate(schedule.cronTime)) {
      console.error("❌ Invalid cron expression:", schedule.cronTime);
      console.log("Using default: 0 3 * * * (Daily at 3:00 AM)");
      schedule.cronTime = "0 3 * * *";
    }

    // Stop existing task if any
    if (scheduledTask) {
      scheduledTask.stop();
    }

    // Schedule backup task
    scheduledTask = cron.schedule(
      schedule.cronTime,
      async () => {
        const now = moment().tz("Asia/Tashkent");
        console.log(
          `\n⏰ Scheduled backup started at ${now.format("DD.MM.YYYY HH:mm:ss")}`
        );

        try {
          await createBackup();
          console.log("✅ Scheduled backup completed successfully");
        } catch (error) {
          console.error("❌ Scheduled backup failed:", error);
          await logger.logError(error, "Scheduled Backup Failed");
        }
      },
      {
        scheduled: true,
        timezone: "Asia/Tashkent",
      }
    );

    const nextRun = getNextRun(schedule.cronTime);
    console.log(`✅ Backup scheduler initialized`);
    console.log(`📅 Schedule: ${schedule.cronTime}`);
    console.log(`⏰ Next backup: ${nextRun}`);
    console.log(`🗓️ Keep backups for: ${schedule.keepDays} days\n`);
  } catch (error) {
    console.error("❌ Failed to initialize scheduler:", error);
    await logger.logError(error, "Backup Scheduler Init Failed");
  }
}

function getNextRun(cronExpression) {
  try {
    const cronParser = require("cron-parser");
    const interval = cronParser.parseExpression(cronExpression, {
      tz: "Asia/Tashkent",
    });
    const next = interval.next().toDate();
    return moment(next).tz("Asia/Tashkent").format("DD.MM.YYYY HH:mm:ss");
  } catch (error) {
    return "Unknown";
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n⚠️ Shutting down backup scheduler...");
  if (scheduledTask) {
    scheduledTask.stop();
  }
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n⚠️ Shutting down backup scheduler...");
  if (scheduledTask) {
    scheduledTask.stop();
  }
  process.exit(0);
});

// Initialize scheduler
if (require.main === module) {
  initScheduler()
    .then(() => {
      console.log("🎯 Backup scheduler is running...");
      console.log("Press Ctrl+C to stop\n");
    })
    .catch((error) => {
      console.error("💥 Failed to start scheduler:", error);
      process.exit(1);
    });
}

module.exports = { initScheduler };
