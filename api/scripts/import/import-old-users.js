/**
 * Import old users from backup/CSV/JSON file
 * Usage: node import-old-users.js <file-path>
 */

require("dotenv/config");
const mongoose = require("mongoose");
const User = require("./models/User");
const fs = require("fs");

async function importUsers(filePath) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Read file
    const fileContent = fs.readFileSync(filePath, "utf-8");
    let users = [];

    // Parse based on file type
    if (filePath.endsWith(".json")) {
      users = JSON.parse(fileContent);
    } else if (filePath.endsWith(".csv")) {
      // Parse CSV
      const lines = fileContent.split("\n");
      const headers = lines[0].split(",");
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",");
        const user = {};
        headers.forEach((header, index) => {
          user[header.trim()] = values[index]?.trim();
        });
        users.push(user);
      }
    }

    console.log(`📋 Found ${users.length} users in file`);

    // Import users
    let imported = 0;
    let skipped = 0;

    for (const userData of users) {
      try {
        // Check if user already exists
        const existing = await User.findOne({ userId: userData.userId });
        if (existing) {
          skipped++;
          continue;
        }

        // Create new user
        const user = new User({
          userId: userData.userId || userData.user_id || userData.id,
          firstName: userData.firstName || userData.first_name || "Unknown",
          username: userData.username || null,
          language: userData.language || "uz",
          location: userData.location || null,
          prayerSettings: userData.prayerSettings || {
            calculationMethod: 3,
            school: 1,
            midnightMode: 0,
          },
          reminderSettings: userData.reminderSettings || {
            enabled: true,
            minutesBefore: 10,
            prayers: {
              fajr: true,
              dhuhr: true,
              asr: true,
              maghrib: true,
              isha: true,
            },
          },
        });

        await user.save();
        imported++;

        if (imported % 100 === 0) {
          console.log(`✅ Imported ${imported} users...`);
        }
      } catch (error) {
        console.error(
          `❌ Error importing user ${userData.userId}:`,
          error.message
        );
      }
    }

    console.log(`\n✅ Import completed!`);
    console.log(`   - Imported: ${imported}`);
    console.log(`   - Skipped (duplicates): ${skipped}`);
    console.log(`   - Total in DB: ${await User.countDocuments()}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Import failed:", error);
    process.exit(1);
  }
}

// Run
const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node import-old-users.js <file-path>");
  console.log("\nSupported formats: .json, .csv");
  console.log("\nExample:");
  console.log("  node import-old-users.js old-users.json");
  console.log("  node import-old-users.js old-users.csv");
  process.exit(1);
}

importUsers(filePath);
