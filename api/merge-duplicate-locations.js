#!/usr/bin/env node

/**
 * Merge duplicate locations
 * Handles both duplicate names and duplicate coordinates
 */

const mongoose = require("mongoose");
const readline = require("readline");
require("dotenv").config();

const Location = require("./models/Location");
const User = require("./models/User");
const PrayerTimeData = require("./models/PrayerTimeData");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function mergeDuplicateLocations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Read report
    const fs = require("fs");
    const reportPath = "./location-analysis-report.json";

    if (!fs.existsSync(reportPath)) {
      console.log("❌ Report not found. Run analyze-locations.js first.");
      process.exit(1);
    }

    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

    const mode = process.argv[2];

    if (mode === "--by-name") {
      await mergeDuplicateNames(report.duplicateNames);
    } else if (mode === "--by-coords") {
      await mergeDuplicateCoords(report.duplicateCoordinates);
    } else {
      console.log("Usage:");
      console.log(
        "  node merge-duplicate-locations.js --by-name    (merge by name)"
      );
      console.log(
        "  node merge-duplicate-locations.js --by-coords  (merge by coordinates)"
      );
      process.exit(1);
    }

    await mongoose.disconnect();
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

async function mergeDuplicateNames(duplicates) {
  const groups = Object.entries(duplicates);

  if (groups.length === 0) {
    console.log("✅ No duplicate names found!");
    return;
  }

  console.log(`🔄 Found ${groups.length} groups of duplicate names\n`);

  for (const [name, locations] of groups) {
    console.log("=".repeat(80));
    console.log(`📍 Duplicate: "${name}" (${locations.length} locations)`);
    console.log("=".repeat(80));

    locations.forEach((loc, idx) => {
      console.log(`\n[${idx + 1}] ${loc.name} (${loc.nameUz} | ${loc.nameRu})`);
      console.log(`    Coordinates: ${loc.lat}, ${loc.lng}`);
      console.log(`    Users: ${loc.users}`);
      console.log(`    Prayer data: ${loc.prayerData} days`);
      console.log(`    ID: ${loc.id}`);
    });

    console.log("\n");
    const answer = await question("Merge these locations? (y/n): ");

    if (answer.toLowerCase() === "y") {
      // Find the best location to keep (most users + most data)
      const keeper = locations.reduce((best, curr) => {
        const bestScore = best.users + best.prayerData;
        const currScore = curr.users + curr.prayerData;
        return currScore > bestScore ? curr : best;
      });

      console.log(
        `\n✅ Keeping: ${keeper.name} (${keeper.users} users, ${keeper.prayerData} days)`
      );
      console.log(`   ID: ${keeper.id}`);

      // Merge others into keeper
      for (const loc of locations) {
        if (loc.id.toString() === keeper.id.toString()) continue;

        console.log(`\n🔄 Merging ${loc.name} → ${keeper.name}`);

        // Update users
        const updatedUsers = await User.updateMany(
          {
            "location.latitude": loc.lat,
            "location.longitude": loc.lng,
          },
          {
            $set: {
              "location.latitude": keeper.lat,
              "location.longitude": keeper.lng,
              "location.name": keeper.name,
            },
          }
        );
        console.log(`   ✅ Updated ${updatedUsers.modifiedCount} users`);

        // Deactivate old location
        await Location.updateOne(
          { _id: loc.id },
          { $set: { isActive: false } }
        );
        console.log(`   ✅ Deactivated location ${loc.name}`);
      }

      console.log(`\n✅ Merge complete!\n`);
    } else {
      console.log("⏭️  Skipped\n");
    }
  }
}

async function mergeDuplicateCoords(duplicates) {
  const groups = Object.entries(duplicates);

  if (groups.length === 0) {
    console.log("✅ No duplicate coordinates found!");
    return;
  }

  console.log(`🔄 Found ${groups.length} groups of duplicate coordinates\n`);

  for (const [coords, locations] of groups) {
    console.log("=".repeat(80));
    console.log(
      `📍 Duplicate coordinates: ${coords} (${locations.length} locations)`
    );
    console.log("=".repeat(80));

    locations.forEach((loc, idx) => {
      console.log(`\n[${idx + 1}] ${loc.name}`);
      console.log(`    Users: ${loc.users}`);
      console.log(`    Prayer data: ${loc.prayerData} days`);
      console.log(`    ID: ${loc.id}`);
    });

    console.log("\n");
    const answer = await question("Merge these locations? (y/n): ");

    if (answer.toLowerCase() === "y") {
      // Find the best location to keep
      const keeper = locations.reduce((best, curr) => {
        const bestScore = best.users + best.prayerData;
        const currScore = curr.users + curr.prayerData;
        return currScore > bestScore ? curr : best;
      });

      console.log(
        `\n✅ Keeping: ${keeper.name} (${keeper.users} users, ${keeper.prayerData} days)`
      );

      // Merge others into keeper
      for (const loc of locations) {
        if (loc.id.toString() === keeper.id.toString()) continue;

        console.log(`\n🔄 Merging ${loc.name} → ${keeper.name}`);

        // Update users (they already have same coordinates)
        const updatedUsers = await User.updateMany(
          { "location.name": loc.name },
          { $set: { "location.name": keeper.name } }
        );
        console.log(`   ✅ Updated ${updatedUsers.modifiedCount} users`);

        // Deactivate old location
        await Location.updateOne(
          { _id: loc.id },
          { $set: { isActive: false } }
        );
        console.log(`   ✅ Deactivated location ${loc.name}`);
      }

      console.log(`\n✅ Merge complete!\n`);
    } else {
      console.log("⏭️  Skipped\n");
    }
  }
}

mergeDuplicateLocations();
