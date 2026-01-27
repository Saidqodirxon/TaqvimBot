const mongoose = require("mongoose");
require("dotenv").config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/ramazonbot")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

const User = require("../models/User");

async function resetAllLocations() {
  console.log("\n🔄 Resetting ALL user locations...\n");

  try {
    const result = await User.updateMany(
      {},
      {
        $set: {
          location: null,
          locationId: null,
          locationRequestedAt: null,
        },
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} users`);
    console.log(`   Total users: ${result.matchedCount}`);
    console.log("\n📍 All users will be asked to select location again\n");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }

  process.exit(0);
}

resetAllLocations();
