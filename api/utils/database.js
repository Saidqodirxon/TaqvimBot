const User = require("../models/User");
const Greeting = require("../models/Greeting");
const Settings = require("../models/Settings");
const logger = require("./logger");
const { logNewUser } = require("./errorLogger");

/**
 * Get or create user in database
 */
async function getOrCreateUser(ctx) {
  try {
    const userId = ctx.from.id;
    const firstName = ctx.from.first_name;
    const username = ctx.from.username;

    // Optimized query - select only needed fields
    let user = await User.findOne({ userId }).select(
      "userId firstName username language location prayerSettings reminderSettings hasJoinedChannel is_block phoneNumber phoneRequestedAt termsAccepted termsAcceptedAt last_active"
    );

    if (!user) {
      // Get default prayer settings
      const defaultSettings = await Settings.getSetting(
        "defaultPrayerSettings",
        {
          calculationMethod: 3, // MWL - Musulmonlar dunyosi ligasi
          school: 1, // Hanafi
          midnightMode: 0,
        }
      );

      console.log("📋 Creating new user with defaults:", defaultSettings);

      user = new User({
        userId,
        firstName,
        username,
        language: null, // Til hali tanlanmagan
        location: null, // Joylashuv hali tanlanmagan
        prayerSettings: {
          calculationMethod: defaultSettings.calculationMethod,
          school: defaultSettings.school,
          midnightMode: defaultSettings.midnightMode,
        },
      });
      await user.save();

      // Get total users count (fast count)
      const totalUsers = await User.estimatedDocumentCount();

      // Log new user directly to ADMIN (not to group)
      await logNewUser(user, totalUsers);
    } else {
      // Update user info if changed (minimal update)
      const needsUpdate =
        user.firstName !== firstName || user.username !== username;
      if (needsUpdate) {
        await User.updateOne(
          { userId },
          {
            $set: {
              firstName,
              username,
              lastActive: new Date(),
            },
          }
        );
        // Update local object
        user.firstName = firstName;
        user.username = username;
        user.lastActive = new Date();
      }
    }

    return user;
  } catch (error) {
    console.error("Error in getOrCreateUser:", error);
    throw error;
  }
}

/**
 * Update user language
 */
async function updateUserLanguage(userId, language) {
  try {
    await User.findOneAndUpdate({ userId }, { language }, { new: true });
  } catch (error) {
    console.error("Error in updateUserLanguage:", error);
    throw error;
  }
}

/**
 * Update user location with coordinates
 */
async function updateUserLocation(userId, locationData) {
  try {
    await User.findOneAndUpdate(
      { userId },
      {
        location: {
          name: locationData.name || locationData,
          latitude: locationData.latitude || 41.2995,
          longitude: locationData.longitude || 69.2401,
          timezone: locationData.timezone || "Asia/Tashkent",
        },
      },
      { new: true }
    );
  } catch (error) {
    console.error("Error in updateUserLocation:", error);
    throw error;
  }
}

/**
 * Get user statistics
 */
async function getUserStats() {
  try {
    const total = await User.countDocuments();
    const blocked = await User.countDocuments({ is_block: true });
    const active = total - blocked;

    const langStats = await User.aggregate([
      { $group: { _id: "$language", count: { $sum: 1 } } },
    ]);

    return {
      total,
      active,
      blocked,
      languages: langStats,
    };
  } catch (error) {
    console.error("Error in getUserStats:", error);
    throw error;
  }
}

/**
 * Save greeting to database
 */
async function saveGreeting(data) {
  try {
    const greeting = new Greeting(data);
    await greeting.save();
    return greeting;
  } catch (error) {
    console.error("Error in saveGreeting:", error);
    throw error;
  }
}

/**
 * Get pending greetings
 */
async function getPendingGreetings() {
  try {
    return await Greeting.find({ status: "pending" }).sort({ createdAt: 1 });
  } catch (error) {
    console.error("Error in getPendingGreetings:", error);
    throw error;
  }
}

/**
 * Update greeting status
 */
async function updateGreetingStatus(greetingId, status, adminComment = null) {
  try {
    const update = { status };
    if (adminComment) {
      update.adminComment = adminComment;
    }

    return await Greeting.findByIdAndUpdate(greetingId, update, { new: true });
  } catch (error) {
    console.error("Error in updateGreetingStatus:", error);
    throw error;
  }
}

/**
 * Get or set settings
 */
async function getSetting(key, defaultValue = null) {
  try {
    const setting = await Settings.findOne({ key });
    return setting ? setting.value : defaultValue;
  } catch (error) {
    console.error("Error in getSetting:", error);
    return defaultValue;
  }
}

async function setSetting(key, value, description = "") {
  try {
    return await Settings.findOneAndUpdate(
      { key },
      { value, description },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error("Error in setSetting:", error);
    throw error;
  }
}

/**
 * Block/Unblock user
 */
async function toggleUserBlock(userId, isBlocked) {
  try {
    return await User.findOneAndUpdate(
      { userId },
      { is_block: isBlocked },
      { new: true }
    );
  } catch (error) {
    console.error("Error in toggleUserBlock:", error);
    throw error;
  }
}

/**
 * Get all users for broadcasting
 */
async function getAllActiveUsers() {
  try {
    return await User.find({ is_block: false }).select("userId");
  } catch (error) {
    console.error("Error in getAllActiveUsers:", error);
    throw error;
  }
}

module.exports = {
  getOrCreateUser,
  updateUserLanguage,
  updateUserLocation,
  getUserStats,
  saveGreeting,
  getPendingGreetings,
  updateGreetingStatus,
  getSetting,
  setSetting,
  toggleUserBlock,
  getAllActiveUsers,
};
