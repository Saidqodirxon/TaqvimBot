const logger = require("../../utils/logger");
const express = require("express");
const router = express.Router();
const Location = require("../../models/Location");
const User = require("../../models/User");
const Settings = require("../../models/Settings");
const axios = require("axios");

/**
 * Get all locations with user count statistics and monthly trends
 */
router.get("/", async (req, res) => {
  try {
    const locations = await Location.find({ isActive: true }).sort({ name: 1 });

    // Get current month and last 3 months dates
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    // Get user count for each location with monthly trends
    const locationsWithStats = await Promise.all(
      locations.map(async (location) => {
        // Current user count
        const userCount = await User.countDocuments({
          "location.latitude": location.latitude,
          "location.longitude": location.longitude,
        });

        // Monthly statistics
        const thisMonthCount = await User.countDocuments({
          "location.latitude": location.latitude,
          "location.longitude": location.longitude,
          createdAt: { $gte: currentMonth },
        });

        const lastMonthCount = await User.countDocuments({
          "location.latitude": location.latitude,
          "location.longitude": location.longitude,
          createdAt: { $gte: lastMonth, $lt: currentMonth },
        });

        const twoMonthsAgoCount = await User.countDocuments({
          "location.latitude": location.latitude,
          "location.longitude": location.longitude,
          createdAt: { $gte: twoMonthsAgo, $lt: lastMonth },
        });

        return {
          ...location.toObject(),
          userCount,
          monthlyStats: {
            thisMonth: thisMonthCount,
            lastMonth: lastMonthCount,
            twoMonthsAgo: twoMonthsAgoCount,
          },
          growth: lastMonthCount > 0 
            ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100) 
            : thisMonthCount > 0 ? 100 : 0,
        };
      })
    );

    res.json(locationsWithStats);
  } catch (error) {
    logger.error("Error fetching locations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get single location
 */
router.get("/:id", async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: "Location not found" });
    }
    res.json(location);
  } catch (error) {
    logger.error("Error fetching location:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Create new location
 */
router.post("/", async (req, res) => {
  try {
    const {
      name,
      nameUz,
      nameCr,
      nameRu,
      latitude,
      longitude,
      timezone,
      country,
      isDefault,
      manualPrayerTimes,
    } = req.body;
    // Validate required fields
    if (!name || !nameUz || !nameCr || !nameRu || !latitude || !longitude) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await Location.updateMany({}, { isDefault: false });
    }

    const location = new Location({
      name,
      nameUz,
      nameCr,
      nameRu,
      latitude,
      longitude,
      timezone: timezone || "Asia/Tashkent",
      country: country || "Uzbekistan",
      isDefault: isDefault || false,
      manualPrayerTimes: manualPrayerTimes || {
        enabled: false,
      },
    });
    await location.save();
    await logger.logAdminAction(
      { userId: req.user?.id || "system", firstName: "Admin" },
      "Yangi joylashuv qo'shildi",
      `${name} (${latitude}, ${longitude})`
    );

    res.status(201).json(location);
  } catch (error) {
    logger.error("Error creating location:", error);
    await logger.logError(error, "Location creation failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Update location
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const location = await Location.findById(id);
    if (!location) {
      return res.status(404).json({ error: "Location not found" });
    }

    if (updateData.isDefault) {
      await Location.updateMany({ _id: { $ne: id } }, { isDefault: false });
    }

    // Update fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined) {
        location[key] = updateData[key];
      }
    });

    await location.save();

    await logger.logAdminAction(
      req.user,
      "Joylashuv tahrirlandi",
      `${location.name}`
    );

    res.json(location);
  } catch (error) {
    logger.error("Error updating location:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Delete location (soft delete)
 */
router.delete("/:id", async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: "Location not found" });
    }

    location.isActive = false;
    await location.save();

    await logger.logAdminAction(
      req.user,
      "Joylashuv o'chirildi",
      `${location.name}`
    );

    res.json({ success: true, message: "Location deleted" });
  } catch (error) {
    logger.error("Error deleting location:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get locations for bot (user-facing)
 */
router.get("/public/list", async (req, res) => {
  try {
    const locations = await Location.find({ isActive: true })
      .select("name nameUz nameCr nameRu latitude longitude timezone")
      .sort({ isDefault: -1, name: 1 });

    res.json(locations);
  } catch (error) {
    logger.error("Error fetching public locations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Report location fallback to API (when prayer times fetched from Aladhan instead of local DB)
 */
router.post("/fallback-report", async (req, res) => {
  try {
    const { latitude, longitude, userId, source, reason } = req.body;
    
    // Log the fallback event
    await logger.logAdminAction(
      { userId: userId || "system", firstName: "System" },
      "Location Fallback",
      `Koordinatalar: ${latitude}, ${longitude} | Source: ${source} | Reason: ${reason}`
    );

    // Send notification to admin log channel
    const logChannel = await Settings.getSetting("log_channel", null);
    if (logChannel) {
      const botToken = process.env.BOT_TOKEN;
      const message = `⚠️ <b>Location Fallback Alert</b>\n\n` +
        `📍 <b>Koordinatalar:</b> ${latitude}, ${longitude}\n` +
        `👤 <b>User ID:</b> ${userId || "Unknown"}\n` +
        `📡 <b>Source:</b> ${source || "Aladhan API"}\n` +
        `❓ <b>Sabab:</b> ${reason || "Local data topilmadi"}\n\n` +
        `💡 Ushbu joylashuv uchun mahalliy ma'lumotlar yo'q. ` +
        `<a href="https://ramazonbot-admin.saidqodirxon.uz/locations">Admin paneldan</a> qo'shing.`;
      
      try {
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          chat_id: logChannel,
          text: message,
          parse_mode: "HTML",
        });
      } catch (notifyErr) {
        console.error("Failed to send fallback notification:", notifyErr.message);
      }
    }

    res.json({ success: true, message: "Fallback reported" });
  } catch (error) {
    logger.error("Error reporting location fallback:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get location fallback logs
 */
router.get("/fallback-logs", async (req, res) => {
  try {
    // Get fallback logs from admin logs
    const GreetingLog = require("../../models/GreetingLog");
    const logs = await GreetingLog.find({ 
      action: "Location Fallback" 
    }).sort({ createdAt: -1 }).limit(100);
    
    res.json(logs);
  } catch (error) {
    logger.error("Error fetching fallback logs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
