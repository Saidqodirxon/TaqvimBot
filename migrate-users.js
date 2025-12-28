// Migration script to update all users with default prayer settings from admin panel
const mongoose = require("mongoose");
require("dotenv/config");
const User = require("./models/User");
const Settings = require("./models/Settings");

async function migrateUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to database");

    // Get default settings from admin panel
    const defaultSettings = await Settings.getSetting("defaultPrayerSettings", {
      calculationMethod: 1,
      school: 1,
      midnightMode: 0,
    });

    console.log("Default settings from admin:", defaultSettings);

    // Update all users who have Karachi (1) to use the new default
    const result = await User.updateMany(
      {
        $or: [
          { "prayerSettings.calculationMethod": { $exists: false } },
          { "prayerSettings.calculationMethod": 1 },
        ],
      },
      {
        $set: {
          "prayerSettings.calculationMethod": defaultSettings.calculationMethod,
          "prayerSettings.school": defaultSettings.school,
          "prayerSettings.midnightMode": defaultSettings.midnightMode,
        },
        $unset: {
          "prayerSettings.latitudeAdjustment": "",
        },
      }
    );

    console.log(`Updated ${result.modifiedCount} users`);
    console.log("Migration completed!");

    process.exit(0);
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
}

migrateUsers();
