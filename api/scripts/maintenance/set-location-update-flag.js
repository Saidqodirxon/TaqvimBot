const mongoose = require("mongoose");
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const User = require("../../models/User");

/**
 * Set needsLocationUpdate flag for all users
 * This will force all users to re-select their location
 */
async function setLocationUpdateFlag() {
  try {
    console.log("\n" + "=".repeat(70));
    console.log("🔧 SET LOCATION UPDATE FLAG FOR ALL USERS");
    console.log("=".repeat(70) + "\n");

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ MongoDB connected\n");

    // Count users before update
    const totalUsers = await User.countDocuments({});
    console.log(`📊 Total users in database: ${totalUsers}\n`);

    // Set needsLocationUpdate to true for all users
    const result = await User.updateMany(
      {},
      {
        $set: {
          needsLocationUpdate: true,
        },
      }
    );

    console.log("✅ Update completed:");
    console.log(`   📝 Modified: ${result.modifiedCount} users`);
    console.log(`   ✅ Matched: ${result.matchedCount} users\n`);

    console.log("=".repeat(70));
    console.log("✅ OPERATION COMPLETED SUCCESSFULLY");
    console.log("=".repeat(70) + "\n");

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

setLocationUpdateFlag();
