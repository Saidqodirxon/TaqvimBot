const mongoose = require("mongoose");
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const User = require("../../models/User");

/**
 * TEST MODE - Just count and show what WOULD be reset
 * Does NOT actually modify data
 */
async function testLocationReset() {
  try {
    console.log("\n" + "=".repeat(70));
    console.log("🧪 TEST MODE - LOCATION RESET PREVIEW");
    console.log("=".repeat(70) + "\n");

    console.log("🔌 Connecting to MongoDB Atlas...");
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ MongoDB Atlas connected\n");

    // Count all users
    const totalUsers = await User.countDocuments({});
    console.log(`📊 Total users in database: ${totalUsers.toLocaleString()}\n`);

    // Current state analysis
    const withLocation = await User.countDocuments({
      locationId: { $ne: null },
    });
    const withoutLocation = await User.countDocuments({ locationId: null });
    const needingUpdate = await User.countDocuments({
      needsLocationUpdate: true,
    });
    const withCoordinates = await User.countDocuments({
      "location.latitude": { $exists: true, $ne: null },
    });

    console.log("📈 CURRENT STATE:");
    console.log(`   Users with locationId: ${withLocation.toLocaleString()}`);
    console.log(
      `   Users without locationId: ${withoutLocation.toLocaleString()}`
    );
    console.log(`   Users needing update: ${needingUpdate.toLocaleString()}`);
    console.log(
      `   Users with coordinates: ${withCoordinates.toLocaleString()}\n`
    );

    // Sample users with location
    if (withLocation > 0) {
      console.log("📍 Sample users WITH location (first 3):");
      const samples = await User.find({ locationId: { $ne: null } })
        .limit(3)
        .select("userId username location locationId needsLocationUpdate");

      samples.forEach((user, i) => {
        console.log(`\n   ${i + 1}. User ID: ${user.userId}`);
        console.log(`      Username: @${user.username || "N/A"}`);
        console.log(`      Location: ${user.location?.name || "N/A"}`);
        console.log(`      LocationId: ${user.locationId || "N/A"}`);
        console.log(`      Needs Update: ${user.needsLocationUpdate || false}`);
      });
      console.log();
    }

    // Sample users without location
    if (withoutLocation > 0) {
      console.log("❌ Sample users WITHOUT location (first 3):");
      const samples = await User.find({ locationId: null })
        .limit(3)
        .select("userId username location locationId needsLocationUpdate");

      samples.forEach((user, i) => {
        console.log(`\n   ${i + 1}. User ID: ${user.userId}`);
        console.log(`      Username: @${user.username || "N/A"}`);
        console.log(`      Location: ${user.location?.name || "N/A"}`);
        console.log(`      LocationId: ${user.locationId || "N/A"}`);
        console.log(`      Needs Update: ${user.needsLocationUpdate || false}`);
      });
      console.log();
    }

    console.log("=".repeat(70));
    console.log("🎯 WHAT WILL HAPPEN IF YOU RUN RESET:");
    console.log("=".repeat(70) + "\n");
    console.log(
      `   ✅ ${totalUsers.toLocaleString()} users will have location set to NULL`
    );
    console.log(
      `   ✅ ${totalUsers.toLocaleString()} users will have locationId set to NULL`
    );
    console.log(
      `   ✅ ${totalUsers.toLocaleString()} users will have locationRequestedAt set to NULL`
    );
    console.log(
      `   ✅ ${totalUsers.toLocaleString()} users will have needsLocationUpdate set to TRUE`
    );
    console.log();
    console.log(
      "   📱 All users will see location selection on next interaction"
    );
    console.log(
      "   ⚠️  This cannot be easily undone without database backup!\n"
    );

    console.log("=".repeat(70));
    console.log("✅ TEST COMPLETED - NO DATA MODIFIED");
    console.log("=".repeat(70) + "\n");

    console.log("📌 To actually reset locations:");
    console.log("   node scripts/maintenance/reset-all-locations-to-null.js\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    if (error.name === "MongooseServerSelectionError") {
      console.error("\n⚠️  Cannot connect to MongoDB Atlas!");
      console.error("   Check your MONGODB_URI in .env file");
      console.error("   Make sure your IP is whitelisted in Atlas");
    }
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n⚠️  Operation interrupted");
  await mongoose.disconnect();
  process.exit(0);
});

testLocationReset();
