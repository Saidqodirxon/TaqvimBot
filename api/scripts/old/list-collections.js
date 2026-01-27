const mongoose = require("mongoose");
require("dotenv").config();

async function listCollections() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    console.log("\n📋 All collections in database:\n");
    for (const coll of collections) {
      try {
        const count = await db.collection(coll.name).countDocuments();
        console.log(`   📦 ${coll.name}: ${count} documents`);
      } catch (e) {
        console.log(`   📦 ${coll.name}: (cannot count)`);
      }
    }
    console.log();

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
}

listCollections();
