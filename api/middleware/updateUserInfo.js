const User = require("../models/User");
const logger = require("../utils/logger");

/**
 * Middleware to update user info on every interaction
 * - Updates firstName if it was auto-generated (UserXXXXXX)
 * - Updates username if changed
 * - Updates last_active timestamp
 */
async function updateUserInfo(ctx, next) {
  try {
    if (!ctx.from) return next();

    const userId = ctx.from.id;
    const user = await User.findOne({ userId });

    if (!user) return next();

    const updates = {};
    let needsUpdate = false;

    // Check if firstName was auto-generated and user now has a real name
    if (
      user.firstName &&
      user.firstName.startsWith("User") &&
      user.firstName.match(/^User\d+$/) &&
      ctx.from.first_name &&
      ctx.from.first_name !== user.firstName
    ) {
      updates.firstName = ctx.from.first_name;
      needsUpdate = true;
      logger.info(
        `🔄 Updated auto-generated firstName for user ${userId}: ${user.firstName} → ${ctx.from.first_name}`
      );
    }

    // Update username if changed
    if (ctx.from.username && ctx.from.username !== user.username) {
      updates.username = ctx.from.username;
      needsUpdate = true;
    }

    // Always update last_active
    updates.last_active = new Date();
    updates.lastActive = new Date();
    needsUpdate = true;

    if (needsUpdate) {
      await User.updateOne({ userId }, { $set: updates });
    }

    return next();
  } catch (error) {
    logger.error("Update user info middleware error:", error);
    return next(); // Continue even if update fails
  }
}

module.exports = updateUserInfo;
