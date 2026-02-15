const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");

async function unblockAllUsers() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to database.");

    // Count blocked users first
    const blockedCount = await User.countDocuments({ is_block: true });
    console.log(`Found ${blockedCount} blocked users.`);

    if (blockedCount > 0) {
      // Unblock all users
      const result = await User.updateMany(
        { is_block: true },
        { $set: { is_block: false } }
      );

      console.log(`Successfully unblocked ${result.modifiedCount} users.`);
      console.log(
        "Reason for blocking was identified as: Automatic blocking on 403 Forbidden errors (user blocked bot)."
      );
      console.log(
        "This logic has been removed from api/utils/prayerReminders.js."
      );
    } else {
      console.log("No blocked users found to unblock.");
    }

    console.log("Done.");
    process.exit(0);
  } catch (error) {
    console.error("Error unblocking users:", error);
    process.exit(1);
  }
}

unblockAllUsers();
