/**
 * Extract user IDs from PM2 logs or bot logs
 * Usage: node extract-users-from-logs.js <log-file-path>
 */

require("dotenv/config");
const mongoose = require("mongoose");
const User = require("./models/User");
const fs = require("fs");

async function extractUsersFromLogs(logFilePath) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Read log file
    const logContent = fs.readFileSync(logFilePath, "utf-8");
    console.log(`📋 Reading logs from: ${logFilePath}`);

    // Extract user IDs using regex
    // Common patterns: "userId: 123456789", "user_id: 123456789", "User ID: 123456789", "from: { id: 123456789"
    const userIdPatterns = [
      /userId[:\s]+(\d{6,12})/gi,
      /user_id[:\s]+(\d{6,12})/gi,
      /User ID[:\s]+(\d{6,12})/gi,
      /from[:\s]*{[^}]*id[:\s]+(\d{6,12})/gi,
      /"id"[:\s]+(\d{6,12})/gi,
    ];

    const userIds = new Set();

    for (const pattern of userIdPatterns) {
      let match;
      while ((match = pattern.exec(logContent)) !== null) {
        const userId = parseInt(match[1]);
        if (userId > 100000) {
          // Valid Telegram user ID
          userIds.add(userId);
        }
      }
    }

    console.log(`\n🔍 Found ${userIds.size} unique user IDs in logs`);

    if (userIds.size === 0) {
      console.log("❌ No user IDs found in logs");
      process.exit(0);
    }

    // Import users
    let imported = 0;
    let existing = 0;

    for (const userId of userIds) {
      try {
        const user = await User.findOne({ userId });
        if (user) {
          existing++;
          continue;
        }

        // Create user with minimal info
        await User.create({
          userId,
          firstName: "User",
          username: null,
          language: "uz",
          prayerSettings: {
            calculationMethod: 3,
            school: 1,
            midnightMode: 0,
          },
        });

        imported++;

        if (imported % 100 === 0) {
          console.log(`✅ Imported ${imported} users...`);
        }
      } catch (error) {
        console.error(`❌ Error importing user ${userId}:`, error.message);
      }
    }

    console.log(`\n✅ Import completed!`);
    console.log(`   - New users imported: ${imported}`);
    console.log(`   - Already existing: ${existing}`);
    console.log(`   - Total in DB: ${await User.countDocuments()}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run
const logFilePath = process.argv[2];
if (!logFilePath) {
  console.error("Usage: node extract-users-from-logs.js <log-file-path>");
  console.log("\nExample:");
  console.log("  node extract-users-from-logs.js ~/.pm2/logs/bot-out.log");
  console.log("  node extract-users-from-logs.js /var/log/bot.log");
  process.exit(1);
}

extractUsersFromLogs(logFilePath);
