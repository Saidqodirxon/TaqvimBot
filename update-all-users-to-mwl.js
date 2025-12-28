const mongoose = require("mongoose");
require("dotenv/config");
const User = require("./models/User");
const Settings = require("./models/Settings");

async function updateAllUsersToMWL() {
  try {
    console.log("🚀 Starting migration to MWL...\n");

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || process.env.DB_URL, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4,
    });
    console.log("✅ Database connected\n");

    // Get admin panel's default settings (should be MWL = 3)
    const adminDefaults = await Settings.getSetting("defaultPrayerSettings", {
      calculationMethod: 3, // MWL fallback
      school: 1,
      midnightMode: 0,
    });

    console.log("📋 Admin panel defaults:", adminDefaults);
    console.log("");

    // Update ALL users to use admin panel defaults
    const result = await User.updateMany(
      {}, // Empty filter = all users
      {
        $set: {
          "prayerSettings.calculationMethod": adminDefaults.calculationMethod,
          "prayerSettings.school": adminDefaults.school,
          "prayerSettings.midnightMode": adminDefaults.midnightMode,
        },
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} users`);
    console.log("");

    // Show all users with their methods
    const allUsers = await User.find({});
    console.log("📊 All users after update:");
    allUsers.forEach((u) => {
      const method = u.prayerSettings?.calculationMethod;
      const methodStatus =
        method !== undefined ? `Method ${method}` : "❌ UNDEFINED";
      console.log(`  - ${u.firstName} (${u.userId}): ${methodStatus}`);
    });

    console.log("\n✅ Migration completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

updateAllUsersToMWL();
