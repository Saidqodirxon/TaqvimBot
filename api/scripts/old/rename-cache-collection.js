const mongoose = require("mongoose");
require("dotenv").config();

async function renameCollection() {
  try {
    console.log("\n" + "=".repeat(70));
    console.log("🔄 RENAMING COLLECTION: prayertimecaches → prayertimedata");
    console.log("=".repeat(70) + "\n");

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ MongoDB connected\n");

    const db = mongoose.connection.db;

    // Check if old collection exists
    const collections = await db.listCollections().toArray();
    const oldExists = collections.some((c) => c.name === "prayertimecaches");
    const newExists = collections.some((c) => c.name === "prayertimedata");

    if (!oldExists) {
      console.log("❌ prayertimecaches collection not found!");
      if (newExists) {
        console.log("✅ prayertimedata already exists, nothing to do!\n");
        // Show stats
        const count = await db.collection("prayertimedata").countDocuments();
        console.log(`📊 Documents in prayertimedata: ${count}\n`);
      }
      process.exit(0);
    }

    // Get count before rename
    const count = await db.collection("prayertimecaches").countDocuments();
    console.log("📊 Old collection stats:");
    console.log(`   📦 Documents: ${count}\n`);

    // Rename collection
    console.log("🔄 Renaming collection...\n");
    await db.collection("prayertimecaches").rename("prayertimedata");
    console.log("✅ Collection renamed successfully!\n");

    // Create additional indexes for new schema
    console.log("📑 Creating additional indexes...\n");
    const collection = db.collection("prayertimedata");

    await collection.createIndex({ cityName: 1, date: 1 });
    await collection.createIndex({ region: 1, date: 1 });
    await collection.createIndex({ date: 1 });

    console.log("✅ Indexes created!\n");

    // Update documents to add missing fields
    console.log("🔄 Updating documents with location info...\n");

    const Location = require("./models/Location");
    const locations = await Location.find({ isActive: true }).lean();

    const locationMap = new Map();
    locations.forEach((loc) => {
      const key = `${loc.latitude.toFixed(4)}_${loc.longitude.toFixed(4)}`;
      locationMap.set(key, loc);
    });

    let updated = 0;
    const cursor = collection.find({});

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const location = locationMap.get(doc.locationKey);

      if (location) {
        await collection.updateOne(
          { _id: doc._id },
          {
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
          }
        );
        updated++;

        if (updated % 1000 === 0) {
          console.log(`   ⏳ Updated: ${updated} documents`);
        }
      }
    }

    console.log(`\n✅ Updated ${updated} documents\n`);

    // Final stats
    const finalCount = await collection.countDocuments();
    console.log("=".repeat(70));
    console.log("✅ MIGRATION COMPLETED");
    console.log("=".repeat(70));
    console.log("📊 New collection stats:");
    console.log(`   📦 Documents: ${finalCount}`);
    console.log("=".repeat(70) + "\n");

    await mongoose.disconnect();
    console.log("✅ Database connection closed");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

renameCollection();
