const logger = require("../../utils/logger");
const express = require("express");
const router = express.Router();
const Location = require("../../models/Location");
const User = require("../../models/User");
const Settings = require("../../models/Settings");
const PrayerTimeData = require("../../models/PrayerTimeData");
const MonthlyPrayerTime = require("../../models/MonthlyPrayerTime");
const axios = require("axios");

/**
 * Get all locations with user count statistics - OPTIMIZED (< 2 sec)
 * Uses aggregation pipelines instead of multiple queries
 */
router.get("/", async (req, res) => {
  try {
    // Set timeout for this route
    req.setTimeout(30000);

    const startTime = Date.now();

    // 1. Get all locations (fast)
    const locations = await Location.find({ isActive: true })
      .select(
        "name nameUz nameCr nameRu latitude longitude timezone country isDefault manualPrayerTimes"
      )
      .sort({ name: 1 })
      .lean();

    // 2. Get user counts using aggregation (single query for ALL locations)
    const userCounts = await User.aggregate([
      {
        $match: {
          "location.latitude": { $exists: true },
          "location.longitude": { $exists: true },
        },
      },
      {
        $group: {
          _id: {
            lat: { $round: ["$location.latitude", 4] },
            lng: { $round: ["$location.longitude", 4] },
          },
          total: { $sum: 1 },
          thisMonth: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    "$createdAt",
                    new Date(
                      new Date().getFullYear(),
                      new Date().getMonth(),
                      1
                    ),
                  ],
                },
                1,
                0,
              ],
            },
          },
          lastMonth: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $gte: [
                        "$createdAt",
                        new Date(
                          new Date().getFullYear(),
                          new Date().getMonth() - 1,
                          1
                        ),
                      ],
                    },
                    {
                      $lt: [
                        "$createdAt",
                        new Date(
                          new Date().getFullYear(),
                          new Date().getMonth(),
                          1
                        ),
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    // Create a map for fast lookup
    const userCountMap = new Map();
    userCounts.forEach((uc) => {
      const key = `${uc._id.lat}_${uc._id.lng}`;
      userCountMap.set(key, uc);
    });

    // 3. Get prayer data counts (single aggregation)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 60);
    const endDateStr = endDate.toISOString().split("T")[0];

    const prayerDataCounts = await PrayerTimeData.aggregate([
      {
        $match: {
          date: { $gte: todayStr, $lte: endDateStr },
        },
      },
      {
        $group: {
          _id: "$locationKey",
          count: { $sum: 1 },
        },
      },
    ]);

    const prayerDataMap = new Map();
    prayerDataCounts.forEach((pd) => {
      prayerDataMap.set(pd._id, pd.count);
    });

    // 4. Combine results (no more individual queries!)
    const locationsWithStats = locations.map((location) => {
      const lat = location.latitude?.toFixed(4);
      const lng = location.longitude?.toFixed(4);
      const key = `${lat}_${lng}`;
      const userStats = userCountMap.get(key) || {
        total: 0,
        thisMonth: 0,
        lastMonth: 0,
      };
      const prayerDays = prayerDataMap.get(key) || 0;

      const growth =
        userStats.lastMonth > 0
          ? Math.round(
              ((userStats.thisMonth - userStats.lastMonth) /
                userStats.lastMonth) *
                100
            )
          : userStats.thisMonth > 0
            ? 100
            : 0;

      return {
        ...location,
        userCount: userStats.total,
        monthlyStats: {
          thisMonth: userStats.thisMonth,
          lastMonth: userStats.lastMonth,
        },
        growth,
        prayerDataStats: {
          prayerTimeDataDays: prayerDays,
          totalDays: 60,
          completeness: Math.round((prayerDays / 60) * 100),
          hasManualTimes: location.manualPrayerTimes?.enabled || false,
        },
      };
    });

    const elapsed = Date.now() - startTime;
    console.log(
      `📊 Locations API: ${locations.length} locations in ${elapsed}ms`
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
      const message =
        `⚠️ <b>Location Fallback Alert</b>\n\n` +
        `📍 <b>Koordinatalar:</b> ${latitude}, ${longitude}\n` +
        `👤 <b>User ID:</b> ${userId || "Unknown"}\n` +
        `📡 <b>Source:</b> ${source || "Aladhan API"}\n` +
        `❓ <b>Sabab:</b> ${reason || "Local data topilmadi"}\n\n` +
        `💡 Ushbu joylashuv uchun mahalliy ma'lumotlar yo'q. ` +
        `<a href="https://ramazonbot-admin.saidqodirxon.uz/locations">Admin paneldan</a> qo'shing.`;

      try {
        await axios.post(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            chat_id: logChannel,
            text: message,
            parse_mode: "HTML",
          }
        );
      } catch (notifyErr) {
        console.error(
          "Failed to send fallback notification:",
          notifyErr.message
        );
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
      action: "Location Fallback",
    })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(logs);
  } catch (error) {
    logger.error("Error fetching fallback logs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Check prayer data completeness for all locations
 * Returns locations with missing data and sends alert if needed
 */
router.get("/data-check", async (req, res) => {
  try {
    const locations = await Location.find({ isActive: true });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alerts = [];
    const summary = {
      totalLocations: locations.length,
      locationsWithData: 0,
      locationsWithMissingData: 0,
      locationsWithManualTimes: 0,
    };

    for (const location of locations) {
      const locationKey = `${location.latitude.toFixed(4)}_${location.longitude.toFixed(4)}`;

      // Check if has manual times
      if (location.manualPrayerTimes?.enabled) {
        summary.locationsWithManualTimes++;
        summary.locationsWithData++;
        continue;
      }

      // Check next 7 days for missing data
      const missingDates = [];
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() + i);
        const dateStr = checkDate.toISOString().split("T")[0];

        const hasPrayerData = await PrayerTimeData.exists({
          locationKey,
          date: dateStr,
        });
        const hasMonthlyData = await MonthlyPrayerTime.exists({
          locationId: location._id,
          date: {
            $gte: new Date(new Date(checkDate).setHours(0, 0, 0, 0)),
            $lt: new Date(new Date(checkDate).setHours(23, 59, 59, 999)),
          },
        });

        if (!hasPrayerData && !hasMonthlyData) {
          missingDates.push(dateStr);
        }
      }

      if (missingDates.length > 0) {
        summary.locationsWithMissingData++;

        // Get user count for this location
        const userCount = await User.countDocuments({
          "location.latitude": location.latitude,
          "location.longitude": location.longitude,
        });

        alerts.push({
          location: location.name,
          locationId: location._id,
          userCount,
          missingDates,
          daysUntilFirst: Math.ceil(
            (new Date(missingDates[0]) - today) / (1000 * 60 * 60 * 24)
          ),
          urgent:
            missingDates.includes(today.toISOString().split("T")[0]) ||
            missingDates.includes(
              new Date(today.getTime() + 86400000).toISOString().split("T")[0]
            ),
        });
      } else {
        summary.locationsWithData++;
      }
    }

    // Sort alerts by urgency and user count
    alerts.sort((a, b) => {
      if (a.urgent !== b.urgent) return b.urgent - a.urgent;
      return b.userCount - a.userCount;
    });

    res.json({
      summary,
      alerts,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error checking prayer data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Send alert to admin about missing prayer data
 */
router.post("/data-check/alert", async (req, res) => {
  try {
    const locations = await Location.find({ isActive: true });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const urgentAlerts = [];

    for (const location of locations) {
      if (location.manualPrayerTimes?.enabled) continue;

      const locationKey = `${location.latitude.toFixed(4)}_${location.longitude.toFixed(4)}`;

      // Check next 3 days
      for (let i = 0; i < 3; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() + i);
        const dateStr = checkDate.toISOString().split("T")[0];

        const hasPrayerData = await PrayerTimeData.exists({
          locationKey,
          date: dateStr,
        });
        const hasMonthlyData = await MonthlyPrayerTime.exists({
          locationId: location._id,
          date: {
            $gte: new Date(new Date(checkDate).setHours(0, 0, 0, 0)),
            $lt: new Date(new Date(checkDate).setHours(23, 59, 59, 999)),
          },
        });

        if (!hasPrayerData && !hasMonthlyData) {
          const userCount = await User.countDocuments({
            "location.latitude": location.latitude,
            "location.longitude": location.longitude,
          });

          if (userCount > 0) {
            urgentAlerts.push({
              location: location.name,
              date: dateStr,
              userCount,
              daysUntil: i,
            });
          }
          break; // Only report first missing date per location
        }
      }
    }

    if (urgentAlerts.length > 0) {
      // Send notification to admin
      const logChannel = await Settings.getSetting("log_channel", null);
      if (logChannel) {
        const botToken = process.env.BOT_TOKEN;

        let message = `🚨 <b>NAMOZ VAQTLARI MA'LUMOTLARI YETISHMAYAPTI!</b>\n\n`;
        message += `📅 Tekshirilgan: ${new Date().toLocaleDateString("uz-UZ")}\n`;
        message += `⚠️ ${urgentAlerts.length} ta joylashuv uchun ma'lumot yo'q:\n\n`;

        urgentAlerts.slice(0, 10).forEach((alert, i) => {
          const urgency =
            alert.daysUntil === 0 ? "🔴" : alert.daysUntil === 1 ? "🟠" : "🟡";
          message += `${urgency} <b>${alert.location}</b>\n`;
          message += `   📅 ${alert.date} (${alert.daysUntil === 0 ? "BUGUN!" : alert.daysUntil + " kun qoldi"})\n`;
          message += `   👥 ${alert.userCount} foydalanuvchi\n\n`;
        });

        if (urgentAlerts.length > 10) {
          message += `...va yana ${urgentAlerts.length - 10} ta joylashuv\n\n`;
        }

        message += `💡 <a href="https://ramazonbot-admin.saidqodirxon.uz/locations">Admin paneldan</a> ma'lumotlarni to'ldiring.`;

        try {
          await axios.post(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
              chat_id: logChannel,
              text: message,
              parse_mode: "HTML",
            }
          );
        } catch (notifyErr) {
          console.error("Failed to send data alert:", notifyErr.message);
        }
      }
    }

    res.json({
      success: true,
      alertsSent: urgentAlerts.length,
      alerts: urgentAlerts,
    });
  } catch (error) {
    logger.error("Error sending data alert:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
