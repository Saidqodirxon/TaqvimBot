const mongoose = require("mongoose");
require("dotenv").config();
const Location = require("./models/Location");
const fs = require("fs");
const path = require("path");

async function importAllCities() {
  try {
    console.log("🚀 Starting Uzbekistan Cities Import\n");

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected\n");

    // Read JSON file
    const jsonPath = path.join(
      __dirname,
      "uzbekistan-all-cities-extended.json"
    );
    const citiesData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

    console.log(`📦 Found ${citiesData.length} cities to import\n`);

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const cityData of citiesData) {
      try {
        // Check if city already exists by coordinates
        const existing = await Location.findOne({
          latitude: cityData.latitude,
          longitude: cityData.longitude,
        });

        if (existing) {
          // Update if names or priority changed
          const needsUpdate =
            existing.nameUz !== cityData.nameUz ||
            existing.nameRu !== cityData.nameRu ||
            existing.priority !== cityData.priority;

          if (needsUpdate) {
            await Location.updateOne(
              { _id: existing._id },
              {
                $set: {
                  name: cityData.name,
                  nameUz: cityData.nameUz,
                  nameCr: cityData.nameCr,
                  nameRu: cityData.nameRu,
                  nameEn: cityData.name,
                  region: cityData.region,
                  population: cityData.population,
                  priority: cityData.priority,
                  isActive: true,
                },
              }
            );
            updated++;
            console.log(`✏️  Updated: ${cityData.nameUz} (${cityData.nameRu})`);
          } else {
            skipped++;
            if (skipped % 20 === 0) {
              console.log(`⏭️  Skipped ${skipped} existing cities...`);
            }
          }
        } else {
          // Insert new city
          await Location.create({
            name: cityData.name,
            nameUz: cityData.nameUz,
            nameCr: cityData.nameCr,
            nameRu: cityData.nameRu,
            nameEn: cityData.name,
            nameCyrillic: cityData.nameCr,
            latitude: cityData.latitude,
            longitude: cityData.longitude,
            region: cityData.region,
            population: cityData.population,
            priority: cityData.priority,
            isActive: true,
            timezone: "Asia/Tashkent",
          });
          imported++;
          console.log(`➕ Imported: ${cityData.nameUz} (${cityData.nameRu})`);
        }
      } catch (error) {
        failed++;
        console.error(`❌ Error with ${cityData.nameUz}: ${error.message}`);
      }
    }

    // Final summary
    console.log("\n" + "=".repeat(70));
    console.log("🎉 IMPORT COMPLETED");
    console.log("=".repeat(70));
    console.log(`📊 Total cities processed: ${citiesData.length}`);
    console.log(`➕ New imports: ${imported}`);
    console.log(`✏️  Updated: ${updated}`);
    console.log(`⏭️  Skipped (unchanged): ${skipped}`);
    console.log(`❌ Failed: ${failed}`);
    console.log("=".repeat(70));

    // Show current database stats
    const totalInDb = await Location.countDocuments({ isActive: true });
    console.log(`\n📍 Total active locations in database: ${totalInDb}`);

    // Show top 10 cities by priority
    const topCities = await Location.find({ isActive: true })
      .sort({ priority: -1, population: -1 })
      .limit(10)
      .select("nameUz nameRu priority population region")
      .lean();

    console.log("\n🏆 Top 10 cities by priority:");
    topCities.forEach((city, i) => {
      console.log(
        `${i + 1}. ${city.nameUz} (${city.nameRu}) - Priority: ${city.priority}, Pop: ${city.population?.toLocaleString() || "N/A"}`
      );
    });

    mongoose.connection.close();
    console.log("\n✅ Database connection closed");
    console.log("✨ All done!\n");
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  }
}

importAllCities();
