const express = require("express");
const router = express.Router();
const User = require("../../models/User");
const { getPrayerTimes } = require("../../utils/aladhan");
const axios = require("axios");
const moment = require("moment-timezone");
const logger = require("../../utils/logger");

/**
 * Test endpoint - returns specific test user data
 */
router.get("/test", async (req, res) => {
  try {
    const testUserId = 1551855614;
    const user = await User.findOne({ userId: testUserId });
    if (!user) {
      return res.status(404).json({
        error: "Test user not found",
        userId: testUserId,
      });
    }
    res.json({
      userId: user.userId,
      firstName: user.firstName,
      language: user.language,
      location: user.location,
      prayerSettings: user.prayerSettings,
      reminderSettings: user.reminderSettings,
      isTestMode: true,
    });
  } catch (error) {
    logger.error("Test endpoint error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
/**
 * Get user data for mini app
 */
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    // Validate userId
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    const user = await User.findOne({ userId: parseInt(userId) });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return user data in format expected by frontend
    res.json({
      userId: user.userId,
      firstName: user.firstName,
      language: user.language,
      location: user.location,
      prayerSettings: user.prayerSettings,
      reminderSettings: user.reminderSettings,
      hasJoinedChannel: user.hasJoinedChannel || false, // Add channel status
    });
  } catch (error) {
    logger.error("Mini app user fetch error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get prayer times for user
 */
router.post("/prayer-times", async (req, res) => {
  try {
    const { userId, latitude, longitude } = req.body;
    // Validate required parameters
    if (!userId || !latitude || !longitude) {
      return res.status(400).json({
        error: "Missing required parameters",
        required: ["userId", "latitude", "longitude"],
      });
    }
    // Get user data
    const user = await User.findOne({ userId: parseInt(userId) });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // Get user's prayer settings
    const method = user.prayerSettings?.calculationMethod || 1;
    const school = user.prayerSettings?.school || 1;
    const midnightMode = user.prayerSettings?.midnightMode || 0;
    const latitudeAdjustment = user.prayerSettings?.latitudeAdjustment || 1;
    // Fetch prayer times
    const prayerData = await getPrayerTimes(
      latitude,
      longitude,
      method,
      school,
      midnightMode,
      latitudeAdjustment
    );

    if (!prayerData || !prayerData.success) {
      const errorMsg = prayerData?.error || "Failed to fetch prayer times";
      logger.error("Prayer times fetch failed", {
        userId,
        latitude,
        longitude,
        errorMsg,
        prayerData,
      });

      // Don't expose internal errors to user, just log them
      return res.status(500).json({
        error: "Namoz vaqtlarini yuklashda xatolik",
      });
    }

    // Log if prayer times are outdated
    if (prayerData.outdated) {
      logger.warn("Prayer times outdated", {
        userId,
        warning: prayerData.warning,
      });
    }

    res.json(prayerData);
  } catch (error) {
    logger.error("Prayer times error", {
      error: error.message,
      stack: error.stack,
      userId: req.body.userId,
    });
    res
      .status(500)
      .json({ error: "Internal server error", message: error.message });
  }
});

/**
 * Get weekly prayer times for user
 */
router.post("/weekly-prayer-times", async (req, res) => {
  try {
    const { userId, latitude, longitude } = req.body;
    // Validate required parameters
    if (!userId || !latitude || !longitude) {
      return res.status(400).json({
        error: "Missing required parameters",
        required: ["userId", "latitude", "longitude"],
      });
    }
    // Get user data
    const user = await User.findOne({ userId: parseInt(userId) });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // Get user's prayer settings
    const method = user.prayerSettings?.calculationMethod || 1;
    const school = user.prayerSettings?.school || 1;
    const midnightMode = user.prayerSettings?.midnightMode || 0;
    const latitudeAdjustment = user.prayerSettings?.latitudeAdjustment || 1;

    const calendar = [];
    // Get base date at start of today
    const baseDate = moment().tz("Asia/Tashkent").startOf("day");
    // Get next 7 days
    for (let i = 0; i < 7; i++) {
      // Clone base date and add days
      const date = baseDate.clone().add(i, "days").toDate();
      try {
        const prayerData = await getPrayerTimes(
          latitude,
          longitude,
          method,
          school,
          midnightMode,
          latitudeAdjustment,
          date
        );
        if (prayerData.success) {
          calendar.push({
            date: prayerData.date,
            hijri: prayerData.hijri,
            timings: prayerData.timings,
            manual: prayerData.manual || false,
            monthly: prayerData.monthly || false,
          });
        }
      } catch (error) {
        logger.error(
          `Error fetching prayer times for day ${i}:`,
          error.message
        );
      }
    }
    res.json({
      success: true,
      calendar,
    });
  } catch (error) {
    logger.error("Error fetching weekly prayer times:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Check if user has joined required channels
 * Returns channel list and membership status
 */
router.get("/check-channels/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Get bot instance from app
    const bot = req.app.get("bot");
    if (!bot) {
      logger.error("Bot instance not available in check-channels");
      // Return success if bot not available - don't block app
      return res.json({
        required: false,
        hasJoined: true,
        channels: [],
      });
    }

    const Settings = require("../../models/Settings");
    let channels = [];

    try {
      channels = await Settings.getSetting("channels", []);
    } catch (err) {
      logger.error("Failed to get channels setting:", err.message);
      // Return success if settings fail - don't block app
      return res.json({
        required: false,
        hasJoined: true,
        channels: [],
      });
    }

    const activeChannels = channels.filter((ch) => ch.isActive === true);

    if (activeChannels.length === 0) {
      return res.json({
        required: false,
        hasJoined: true,
        channels: [],
      });
    }

    const channelsWithStatus = [];
    let allJoined = true;

    for (const channel of activeChannels) {
      let isMember = false;
      try {
        const member = await bot.telegram.getChatMember(
          channel.id,
          parseInt(userId)
        );
        isMember = ["creator", "administrator", "member"].includes(
          member.status
        );
      } catch (error) {
        logger.error(
          `Channel check error (${channel.username}):`,
          error.message
        );
        isMember = false;
      }

      if (!isMember) {
        allJoined = false;
      }

      channelsWithStatus.push({
        id: channel.id,
        title: channel.title,
        username: channel.username,
        link: channel.link || `https://t.me/${channel.username}`,
        isMember,
      });
    }

    // Update user hasJoinedChannel status if all joined
    if (allJoined) {
      try {
        await User.updateOne(
          { userId: parseInt(userId) },
          { $set: { hasJoinedChannel: true } }
        );
      } catch (err) {
        logger.error("Failed to update user channel status:", err.message);
        // Don't fail the request
      }
    }

    res.json({
      required: true,
      hasJoined: allJoined,
      channels: channelsWithStatus,
    });
  } catch (error) {
    logger.error("Check channels error:", error);
    // Don't block app on error - return success
    res.json({
      required: false,
      hasJoined: true,
      channels: [],
    });
  }
});

module.exports = router;
