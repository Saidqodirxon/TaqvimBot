const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");
const fs = require("fs");
const path = require("path");

// Load user IDs from us.json
const US_JSON_PATH = path.join(__dirname, "us.json");

async function importUsersFromJSON() {
  try {
    console.log("\n" + "=".repeat(70));
    console.log("📋 IMPORTING USERS FROM us.json");
    console.log("=".repeat(70) + "\n");

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ MongoDB connected\n");

    // Read us.json
    if (!fs.existsSync(US_JSON_PATH)) {
      console.log("❌ us.json file not found!");
      process.exit(1);
    }

    const userIds = JSON.parse(fs.readFileSync(US_JSON_PATH, "utf-8"));
    console.log(`📊 Found ${userIds.length} user IDs in us.json\n`);

    // Filter out negative IDs (groups/channels) and duplicates
    const validUserIds = [...new Set(userIds.filter((id) => id > 0))];
    const invalidIds = userIds.length - validUserIds.length;

    console.log(`✅ Valid user IDs: ${validUserIds.length}`);
    console.log(`⚠️  Invalid/duplicate IDs: ${invalidIds}\n`);

    let newUsers = 0;
    let existingUsers = 0;
    let errors = 0;

    console.log("🔄 Processing users in batches...\n");

    // Process in batches of 500 for better performance
    const BATCH_SIZE = 500;
    for (let i = 0; i < validUserIds.length; i += BATCH_SIZE) {
      const batch = validUserIds.slice(i, i + BATCH_SIZE);

      try {
        // Check existing users in batch
        const existingUserIds = await User.find({
          userId: { $in: batch },
        }).distinct("userId");

        const existingSet = new Set(existingUserIds);
        const newUserBatch = batch.filter((id) => !existingSet.has(id));

        existingUsers += batch.length - newUserBatch.length;

        // Insert new users in bulk
        if (newUserBatch.length > 0) {
          const usersToInsert = newUserBatch.map((userId) => ({
            userId,
            firstName: `User${userId}`,
            username: null,
            language: "uz",
            hasJoinedChannel: false,
            isActive: true,
            source: "us.json_import",
            createdAt: new Date(),
          }));

          await User.insertMany(usersToInsert, { ordered: false });
          newUsers += newUserBatch.length;
        }

        // Progress indicator
        const processed = Math.min(i + BATCH_SIZE, validUserIds.length);
        console.log(
          `   ⏳ Progress: ${processed}/${validUserIds.length} processed (${((processed / validUserIds.length) * 100).toFixed(1)}%)`
        );
      } catch (error) {
        // Handle duplicate key errors gracefully
        if (error.code === 11000) {
          // Some duplicates in batch, count them
          const successCount = error.result?.nInserted || 0;
          newUsers += successCount;
          existingUsers += batch.length - successCount;
        } else {
          errors++;
          console.error(`   ❌ Batch error:`, error.message);
        }
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("✅ IMPORT COMPLETED");
    console.log("=".repeat(70));
    console.log(`✅ New users imported: ${newUsers}`);
    console.log(`⏭️  Already existed: ${existingUsers}`);
    console.log(`❌ Errors: ${errors}`);
    console.log("=".repeat(70) + "\n");

    // Get total user count
    const totalUsers = await User.countDocuments({});
    console.log(`📊 Total users in database: ${totalUsers}\n`);

    // Get user statistics
    const activeUsers = await User.countDocuments({ isActive: true });
    const withLocation = await User.countDocuments({
      "location.latitude": { $exists: true },
    });
    const withChannel = await User.countDocuments({ hasJoinedChannel: true });

    console.log("📈 User Statistics:");
    console.log(`   👥 Total users: ${totalUsers}`);
    console.log(`   ✅ Active users: ${activeUsers}`);
    console.log(`   📍 With location: ${withLocation}`);
    console.log(`   🔔 Joined channel: ${withChannel}\n`);

    await mongoose.disconnect();
    console.log("✅ Database connection closed");
  } catch (error) {
    console.error("❌ Import error:", error);
    process.exit(1);
  }
}

importUsersFromJSON();
