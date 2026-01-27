require("dotenv").config();
const mongoose = require("mongoose");
const Location = require("./models/Location");
const fs = require("fs");

async function importCities() {
  try {
    console.log("Connecting...");
    await mongoose.connect(process.env.MONGODB_URI);

    const cities = JSON.parse(
      fs.readFileSync("./data/uzbekistan-all-cities.json", "utf8")
    );
    console.log(`Total cities: ${cities.length}`);

    let imported = 0,
      skipped = 0,
      updated = 0;

    for (const city of cities) {
      const existing = await Location.findOne({
        latitude: city.lat,
        longitude: city.lon,
      });

      if (existing) {
        if (existing.nameUz !== city.nameUz || !existing.region) {
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
        } else {
          skipped++;
        }
      } else {
        const location = new Location({
          name: city.name,
          nameEn: city.name,
          nameUz: city.nameUz,
          nameCyrillic: city.nameCr,
          nameCr: city.nameCr,
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
      }
    }

    const totalInDb = await Location.countDocuments();
    console.log("\nSummary:");
    console.log(`  New: ${imported}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Total in DB: ${totalInDb}`);

    await mongoose.connection.close();
    console.log("Done!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

importCities();
