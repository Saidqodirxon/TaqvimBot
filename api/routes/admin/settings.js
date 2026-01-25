const logger = require("../../utils/logger");
const express = require("express");
const router = express.Router();
const {
  authMiddleware,
  superAdminOnly,
} = require("../../middleware/adminAuth");
const Settings = require("../../models/Settings");

// Get all settings
router.get("/", authMiddleware, async (req, res) => {
  try {
    const settings = await Settings.find();
    res.json({ settings });
  } catch (error) {
    logger.error("Get settings error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});
// Get setting by key
router.get("/:key", authMiddleware, async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: req.params.key });
    if (!setting) {
      return res.status(404).json({ error: "Sozlama topilmadi" });
    }
    res.json({ setting });
  } catch (error) {
    logger.error("Get setting error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});
// Update setting
router.put("/:key", authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const { value, description } = req.body;
    const setting = await Settings.setSetting(
      req.params.key,
      value,
      description
    );
    res.json({
      message: "Sozlama yangilandi",
      setting,
    });
  } catch (error) {
    logger.error("Update setting error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});
// Set required channel
router.post(
  "/required-channel",
  authMiddleware,
  superAdminOnly,
  async (req, res) => {
    try {
      const { channelId, channelUsername, channelTitle } = req.body;
      await Settings.setSetting(
        "required_channel",
        channelId,
        "Majburiy kanal"
      );
      await Settings.setSetting(
        "channel_info",
        { username: channelUsername, title: channelTitle },
        "Kanal ma'lumotlari"
      );
      res.json({ message: "Majburiy kanal o'rnatildi" });
    } catch (error) {
      logger.error("Set required channel error:", error);
      res.status(500).json({ error: "Server xatosi" });
    }
  }
);
// Set greeting channel
router.post(
  "/greeting-channel",
  authMiddleware,
  superAdminOnly,
  async (req, res) => {
    try {
      const { channelId } = req.body;
      await Settings.setSetting("greeting_channel", channelId, "Tabrik kanali");
      res.json({ message: "Tabrik kanali o'rnatildi" });
    } catch (error) {
      logger.error("Set greeting channel error:", error);
      res.status(500).json({ error: "Server xatosi" });
    }
  }
);
// Toggle required channel (enable/disable)
router.post(
  "/toggle-required-channel",
  authMiddleware,
  superAdminOnly,
  async (req, res) => {
    try {
      const { enabled } = req.body;
      await Settings.setSetting(
        "required_channel_enabled",
        enabled,
        "Majburiy kanal faolligi"
      );
      res.json({
        message: enabled
          ? "Majburiy kanal yoqildi"
          : "Majburiy kanal o'chirildi",
      });
    } catch (error) {
      logger.error("Toggle required channel error:", error);
      res.status(500).json({ error: "Server xatosi" });
    }
  }
);
// Set about bot text
router.post("/about-text", authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const { aboutText } = req.body;
    if (!aboutText || typeof aboutText !== "object") {
      return res.status(400).json({
        error: "aboutText kerak (uz, cr, ru tillari bilan object)",
      });
    }
    await Settings.setSetting(
      "about_bot_text",
      aboutText,
      "Bot haqida matn (uz, cr, ru)"
    );
    res.json({ message: "Bot haqida matni yangilandi", aboutText });
  } catch (error) {
    logger.error("Set about text error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});
// Set Ramadan start date
router.post(
  "/ramadan-date",
  authMiddleware,
  superAdminOnly,
  async (req, res) => {
    try {
      const { date } = req.body;
      if (!date) {
        return res
          .status(400)
          .json({ error: "date kerak (YYYY-MM-DD format)" });
      }
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({
          error: "Noto'g'ri format. YYYY-MM-DD formatda kiriting",
        });
      }
      await Settings.setSetting(
        "ramadan_start_date",
        date,
        "Ramazon boshlanish sanasi"
      );
      res.json({ message: "Ramazon sanasi o'rnatildi", date });
    } catch (error) {
      logger.error("Set Ramadan date error:", error);
      res.status(500).json({ error: "Server xatosi" });
    }
  }
);
// Set reminder settings
router.post(
  "/reminder-settings",
  authMiddleware,
  superAdminOnly,
  async (req, res) => {
    try {
      const { enabled, defaultMinutes, notifyAtPrayerTime, offerReminders } =
        req.body;
      const reminderSettings = {
        enabled:
          typeof enabled === "boolean"
            ? enabled
            : ((await Settings.getSetting("reminder_settings"))?.enabled ??
              true),
        defaultMinutes:
          typeof defaultMinutes === "number"
            ? defaultMinutes
            : ((await Settings.getSetting("reminder_settings"))
                ?.defaultMinutes ?? 10),
        notifyAtPrayerTime:
          typeof notifyAtPrayerTime === "boolean"
            ? notifyAtPrayerTime
            : ((await Settings.getSetting("reminder_settings"))
                ?.notifyAtPrayerTime ?? true),
        offerReminders:
          typeof offerReminders === "boolean"
            ? offerReminders
            : ((await Settings.getSetting("reminder_settings"))
                ?.offerReminders ?? true),
      };
      await Settings.setSetting(
        "reminder_settings",
        reminderSettings,
        "Eslatma sozlamalari"
      );
      res.json({ message: "Eslatma sozlamalari saqlandi", reminderSettings });
    } catch (error) {
      logger.error("Set reminder settings error:", error);
      res.status(500).json({ error: "Server xatosi" });
    }
  }
);
// Set prayers text
router.post("/prayers", authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const { prayers } = req.body;
    if (!prayers || typeof prayers !== "object") {
      return res.status(400).json({
        error: "prayers kerak (uz, cr, ru tillari bilan object)",
      });
    }
    await Settings.setSetting(
      "prayers_text",
      prayers,
      "Duolar matni (uz, cr, ru)"
    );
    res.json({ message: "Duolar matni saqlandi", prayers });
  } catch (error) {
    logger.error("Set prayers error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Set cache settings
router.post(
  "/cache-settings",
  authMiddleware,
  superAdminOnly,
  async (req, res) => {
    try {
      const { ttl, maxSize, autoClean } = req.body;
      const cacheSettings = {
        ttl: typeof ttl === "number" ? ttl : 86400, // 24 hours default
        maxSize: typeof maxSize === "number" ? maxSize : 1000, // 1000 entries default
        autoClean:
          typeof autoClean === "boolean"
            ? autoClean
            : ((await Settings.getSetting("cache_settings"))?.autoClean ??
              true),
      };
      await Settings.setSetting(
        "cache_settings",
        cacheSettings,
        "Cache sozlamalari (TTL, max size, auto clean)"
      );
      res.json({ message: "Cache sozlamalari saqlandi", cacheSettings });
    } catch (error) {
      logger.error("Set cache settings error:", error);
      res.status(500).json({ error: "Server xatosi" });
    }
  }
);

// Set log channel
router.post(
  "/log-channel",
  authMiddleware,
  superAdminOnly,
  async (req, res) => {
    try {
      const { channelId } = req.body;
      if (!channelId) {
        return res.status(400).json({ error: "channelId kerak" });
      }
      await Settings.setSetting(
        "log_channel",
        channelId,
        "Log kanali (error va event loglar)"
      );
      res.json({ message: "Log kanali o'rnatildi", channelId });
    } catch (error) {
      logger.error("Set log channel error:", error);
      res.status(500).json({ error: "Server xatosi" });
    }
  }
);

// Set channel join delay
router.post(
  "/channel-join-delay",
  authMiddleware,
  superAdminOnly,
  async (req, res) => {
    try {
      const { days, hours } = req.body;
      const delaySettings = {
        days: typeof days === "number" ? days : 0,
        hours: typeof hours === "number" ? hours : 0,
      };
      await Settings.setSetting(
        "channel_join_delay",
        delaySettings,
        "Kanal a'zoligini tekshirish kechikishi (kun va soat)"
      );
      res.json({
        message: "Kanal qo'shilish kechikishi o'rnatildi",
        delaySettings,
      });
    } catch (error) {
      logger.error("Set channel join delay error:", error);
      res.status(500).json({ error: "Server xatosi" });
    }
  }
);

// Update bot token (superadmin only)
router.post("/bot-token", authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || !token.trim()) {
      return res.status(400).json({ error: "Token kiritilishi kerak" });
    }

    // Validate token format
    if (!token.match(/^\d+:[A-Za-z0-9_-]{35}$/)) {
      return res.status(400).json({ error: "Noto'g'ri token formati" });
    }

    // Test token by calling getMe
    const { Telegraf } = require("telegraf");
    const testBot = new Telegraf(token);

    try {
      const botInfo = await testBot.telegram.getMe();
      console.log("New bot token validated:", botInfo.username);
    } catch (error) {
      return res.status(400).json({ error: "Token ishlamayapti. Tekshiring!" });
    }

    // Update .env file
    const fs = require("fs");
    const path = require("path");
    const envPath = path.join(__dirname, "../../.env");

    let envContent = fs.readFileSync(envPath, "utf8");

    // Replace BOT_TOKEN
    if (envContent.includes("BOT_TOKEN=")) {
      envContent = envContent.replace(/BOT_TOKEN=.*/, `BOT_TOKEN=${token}`);
    } else {
      envContent += `\nBOT_TOKEN=${token}\n`;
    }

    fs.writeFileSync(envPath, envContent, "utf8");

    await logger.logAdminAction(
      { userId: req.user.userId, firstName: "Admin" },
      "Bot token yangilandi",
      "Token o'zgartirildi va saqlandi"
    );

    // Auto restart PM2
    try {
      const { exec } = require("child_process");
      exec("pm2 restart ramazonbot-api", (error, stdout, stderr) => {
        if (error) {
          console.error("PM2 restart error:", error);
        } else {
          console.log("PM2 restarted successfully:", stdout);
        }
      });
    } catch (restartError) {
      console.error("PM2 restart failed:", restartError);
    }

    res.json({
      message: "Token yangilandi va bot avtomatik qayta ishga tushirildi!",
      requiresRestart: false,
      autoRestarted: true,
    });
  } catch (error) {
    logger.error("Update bot token error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;
