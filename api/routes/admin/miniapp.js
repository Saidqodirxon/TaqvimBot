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
      logger.error("Prayer times fetch failed", {
        userId,
        latitude,
        longitude,
      });
      return res.status(500).json({ error: "Failed to fetch prayer times" });
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

module.exports = router;
