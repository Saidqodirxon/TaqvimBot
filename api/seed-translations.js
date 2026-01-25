#!/usr/bin/env node
/**
 * Seed translations from config/translations.js to MongoDB
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Translation = require("./models/Translation");
const translations = require("./config/translations");

async function seedTranslations() {
  try {
    console.log("🌱 Starting translations seed...");

    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || process.env.DB_URL || process.env.MONGO_URI
    );
    console.log("✅ Connected to MongoDB");

    let created = 0;
    let updated = 0;
    let errors = 0;

    // Process each language's translations
    const keys = new Set();
    Object.keys(translations.uz).forEach((key) => keys.add(key));
    Object.keys(translations.cr).forEach((key) => keys.add(key));
    Object.keys(translations.ru).forEach((key) => keys.add(key));

    console.log(`📝 Found ${keys.size} translation keys`);

    for (const key of keys) {
      try {
        const uz = translations.uz[key] || "";
        const cr = translations.cr[key] || "";
        const ru = translations.ru[key] || "";

        if (!uz || !cr || !ru) {
          console.log(
            `⚠️  Skipping ${key}: missing translation in some language`
          );
          continue;
        }

        // Determine category based on key prefix
        let category = "other";
        if (key.startsWith("btn_")) category = "buttons";
        else if (key.startsWith("error_")) category = "errors";
        else if (key.startsWith("admin_")) category = "admin";
        else if (key.startsWith("prayer")) category = "prayers";
        else if (key.startsWith("location_")) category = "location";
        else if (key.startsWith("greeting_")) category = "greeting";
        else if (key.startsWith("calendar_")) category = "calendar";
        else if (key.includes("message") || key.includes("welcome"))
          category = "messages";

        const existing = await Translation.findOne({ key });

        if (existing) {
          await Translation.findOneAndUpdate(
            { key },
            {
              uz,
              cr,
              ru,
              category,
              description: `Auto-seeded from config`,
            }
          );
          updated++;
          console.log(`🔄 Updated: ${key}`);
        } else {
          await Translation.create({
            key,
            uz,
            cr,
            ru,
            category,
            description: `Auto-seeded from config`,
          });
          created++;
          console.log(`➕ Created: ${key}`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error processing ${key}:`, error.message);
      }
    }

    console.log("\n📊 Summary:");
    console.log(`  ➕ Created: ${created}`);
    console.log(`  🔄 Updated: ${updated}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`  ✅ Total: ${created + updated}`);

    await mongoose.disconnect();
    console.log("\n✅ Seed completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seedTranslations();
