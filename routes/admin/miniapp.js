const express = require("express");
const router = express.Router();
const User = require("../../models/User");
const { getPrayerTimes } = require("../../utils/aladhan");
const axios = require("axios");
const moment = require("moment-timezone");

/**
 * Get user data for mini app
 */
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId: parseInt(userId) });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      userId: user.userId,
      firstName: user.firstName,
      language: user.language,
      location: user.location,
      prayerSettings: user.prayerSettings,
      reminderSettings: user.reminderSettings,
    });
  } catch (error) {
    console.error("Error fetching user for mini app:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get prayer times for user
 */
router.post("/prayer-times", async (req, res) => {
  try {
    const { userId, latitude, longitude } = req.body;
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

    if (!prayerData.success) {
      return res.status(500).json({ error: "Failed to fetch prayer times" });
    }

    res.json(prayerData);
  } catch (error) {
    console.error("Error fetching prayer times:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get weekly prayer times for user
 */
router.post("/weekly-prayer-times", async (req, res) => {
  try {
    const { userId, latitude, longitude } = req.body;
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
        console.error(
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
    console.error("Error fetching weekly prayer times:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
