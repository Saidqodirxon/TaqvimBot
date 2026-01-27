const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const User = require("../../models/User");

/**
 * Reset ALL user locations to null and set needsLocationUpdate flag
 * This forces all users to re-select their location
 */
async function resetAllLocations() {
  try {
    console.log("\n" + "=".repeat(70));
    console.log("🔄 RESET ALL USER LOCATIONS TO NULL");
    console.log("=".repeat(70) + "\n");

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ MongoDB connected\n");

    // Count users before update
    const totalUsers = await User.countDocuments({});
    console.log(`📊 Total users in database: ${totalUsers}\n`);

    // Reset ALL location-related fields to null
    const result = await User.updateMany(
      {},
      {
        $set: {
          location: null,
          locationId: null,
          locationRequestedAt: null,
          needsLocationUpdate: true,
        },
      }
    );

    console.log("✅ Location reset completed:");
    console.log(`   📝 Modified: ${result.modifiedCount} users`);
    console.log(`   ✅ Matched: ${result.matchedCount} users\n`);

    // Verify reset
    const withLocation = await User.countDocuments({ locationId: { $ne: null } });
    const needingUpdate = await User.countDocuments({ needsLocationUpdate: true });

    console.log("📊 Verification:");
    console.log(`   Users with location: ${withLocation} (should be 0)`);
    console.log(`   Users needing update: ${needingUpdate} (should be ${totalUsers})`);

    if (withLocation === 0 && needingUpdate === totalUsers) {
      console.log("\n✅ SUCCESS! All users reset correctly!\n");
    } else {
      console.log("\n⚠️  WARNING! Some users may not have been reset correctly!\n");
    }

    console.log("=".repeat(70));
    console.log("✅ OPERATION COMPLETED");
    console.log("=".repeat(70) + "\n");

    console.log("📌 Next steps:");
    console.log("   1. Users will see location selection on next bot interaction");
    console.log("   2. Run broadcast-location-professional.js to notify users");
    console.log("   3. Monitor bot logs for location requests\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n⚠️  Operation interrupted by user");
  await mongoose.disconnect();
  process.exit(0);
});

resetAllLocations();
