const mongoose = require("mongoose");
require("dotenv").config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/ramazonbot")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

const Settings = require("../models/Settings");
const User = require("../models/User");

async function seedSettings() {
  console.log("🌱 Seeding default settings...\n");

  const defaultSettings = [
    // Terms & Privacy Settings
    {
      key: "terms_check_enabled",
      value: true,
      description: "Enable/disable terms acceptance check",
    },
    {
      key: "terms_check_delay_days",
      value: 365, // Check once per year
      description:
        "Days before asking terms again (0 = ask once, never repeat)",
    },
    {
      key: "terms_text_uz",
      value: "Foydalanish shartlari va maxfiylik siyosati",
      description: "Terms text in Uzbek",
    },
    {
      key: "terms_text_ru",
      value: "Условия использования и политика конфиденциальности",
      description: "Terms text in Russian",
    },

    // Phone Settings
    {
      key: "phone_check_enabled",
      value: true,
      description: "Enable/disable phone number check",
    },
    {
      key: "phone_check_delay_days",
      value: 0, // Ask once, never repeat
      description: "Days before asking phone again (0 = ask once)",
    },

    // Location Settings
    {
      key: "location_check_enabled",
      value: true,
      description: "Enable/disable location check",
    },
    {
      key: "location_check_on_actions",
      value: ["prayer_times", "qibla", "monthly_times"],
      description: "Ask location only on specific actions",
    },
    {
      key: "location_search_radius_km",
      value: 50,
      description: "Search radius in km for nearest location",
    },
    {
      key: "location_pagination_limit",
      value: 10,
      description: "Locations per page in manual selection",
    },

    // Redis Cache Settings
    {
      key: "redis_enabled",
      value: false,
      description: "Enable Redis caching",
    },
    {
      key: "redis_host",
      value: "localhost",
      description: "Redis server host",
    },
    {
      key: "redis_port",
      value: 6379,
      description: "Redis server port",
    },
    {
      key: "redis_ttl_prayer_times",
      value: 86400, // 24 hours
      description: "TTL for prayer times cache (seconds)",
    },
    {
      key: "redis_ttl_locations",
      value: 604800, // 7 days
      description: "TTL for locations cache (seconds)",
    },
    {
      key: "redis_ttl_user_data",
      value: 3600, // 1 hour
      description: "TTL for user data cache (seconds)",
    },
  ];

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const setting of defaultSettings) {
    try {
      const existing = await Settings.findOne({ key: setting.key });

      if (existing) {
        console.log(`⏭️  Skipped: ${setting.key} (already exists)`);
        skipped++;
      } else {
        await Settings.create(setting);
        console.log(`✅ Created: ${setting.key}`);
        created++;
      }
    } catch (error) {
      console.error(`❌ Error with ${setting.key}:`, error.message);
    }
  }

  console.log("\n📊 Summary:");
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${defaultSettings.length}`);
}

async function resetUserLocations() {
  console.log("\n🔄 Resetting all user locations to null...");

  try {
    const result = await User.updateMany(
      {},
      {
        $set: {
          location: null,
          latitude: null,
          longitude: null,
          locationId: null,
        },
      }
    );

    console.log(`✅ Reset ${result.modifiedCount} users' locations`);
  } catch (error) {
    console.error("❌ Error resetting locations:", error);
  }
}

async function run() {
  console.log("🚀 Starting setup...\n");

  await seedSettings();

  console.log(
    "\n❓ Reset all user locations? (This will require users to select location again)"
  );
  console.log("   Run with --reset-locations flag to reset locations\n");

  if (process.argv.includes("--reset-locations")) {
    await resetUserLocations();
  } else {
    console.log("⏭️  Skipped location reset (use --reset-locations to reset)");
  }

  console.log("\n✅ Setup complete!");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
