const mongoose = require("mongoose");
require("dotenv").config();

async function completeUpdate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const collection = db.collection("prayertimedata");

    const Location = require("./models/Location");
    const locations = await Location.find({ isActive: true }).lean();

    const locationMap = new Map();
    locations.forEach((loc) => {
      const key = `${loc.latitude.toFixed(4)}_${loc.longitude.toFixed(4)}`;
      locationMap.set(key, loc);
    });

    console.log("\n🔄 Completing document updates...\n");

    // Use bulk operations for better performance
    const bulkOps = [];
    const docsToUpdate = await collection
      .find({ cityName: { $exists: false } })
      .limit(15000)
      .toArray();

    console.log(`📦 Found ${docsToUpdate.length} documents to update\n`);

    for (const doc of docsToUpdate) {
      const location = locationMap.get(doc.locationKey);
      if (location) {
        bulkOps.push({
          updateOne: {
            filter: { _id: doc._id },
            update: {
              $set: {
                cityName: location.name,
                cityNameUz: location.nameUz,
                cityNameRu: location.nameRu,
                latitude: location.latitude,
                longitude: location.longitude,
                region: location.region,
                method: 3,
                school: 1,
              },
            },
          },
        });
      }

      // Execute in batches of 1000
      if (bulkOps.length >= 1000) {
        await collection.bulkWrite(bulkOps);
        console.log(`   ✅ Updated ${bulkOps.length} documents`);
        bulkOps.length = 0; // Clear array
      }
    }

    // Execute remaining
    if (bulkOps.length > 0) {
      await collection.bulkWrite(bulkOps);
      console.log(`   ✅ Updated ${bulkOps.length} documents`);
    }

    console.log("\n✅ All documents updated!\n");

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
}

completeUpdate();
