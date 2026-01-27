/**
 * Import 200+ Uzbekistan cities to MongoDB Location collection
 * Does NOT delete existing data - only adds new cities
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Location = require("./models/Location");
const fs = require("fs");
const path = require("path");

async function importCities() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Load cities data
    const citiesPath = path.join(
      __dirname,
      "data",
      "uzbekistan-all-cities.json"
    );
    const cities = JSON.parse(fs.readFileSync(citiesPath, "utf8"));

    console.log(`📊 Total cities to import: ${cities.length}`);

    let imported = 0;
    let skipped = 0;
    let updated = 0;

    for (const city of cities) {
      // Check if location already exists by coordinates
      const existing = await Location.findOne({
        latitude: city.lat,
        longitude: city.lon,
      });

      if (existing) {
        // Update if names changed
        if (existing.nameUz !== city.nameUz || existing.nameEn !== city.name) {
          await Location.updateOne(
            { _id: existing._id },
            {
              nameEn: city.name,
              nameUz: city.nameUz,
              nameCyrillic: city.nameCr,
              nameRu: city.nameRu,
              population: city.population,
              region: city.region,
              priority: city.priority || 999,
            }
          );
          updated++;
          console.log(`🔄 Updated: ${city.nameUz} (${city.region})`);
        } else {
          skipped++;
          console.log(`⏭️  Skipped: ${city.nameUz} (already exists)`);
        }
        continue;
      }

      // Create new location
      const location = new Location({
        nameEn: city.name,
        nameUz: city.nameUz,
        nameCyrillic: city.nameCr,
        nameRu: city.nameRu,
        latitude: city.lat,
        longitude: city.lon,
        population: city.population || 0,
        region: city.region,
        priority: city.priority || 999,
        isActive: true,
      });

      await location.save();
      imported++;
      console.log(`✅ Imported: ${city.nameUz} (${city.region})`);
    }

    console.log("\n📊 Import Summary:");
    console.log(`   ✅ New imports: ${imported}`);
    console.log(`   🔄 Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📦 Total in file: ${cities.length}`);

    const totalInDb = await Location.countDocuments();
    console.log(`   💾 Total in DB: ${totalInDb}`);

    await mongoose.connection.close();
    console.log("\n✅ Import completed successfully!");
  } catch (error) {
    console.error("❌ Import error:", error);
    process.exit(1);
  }
}

importCities();
