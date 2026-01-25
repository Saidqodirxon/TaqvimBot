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
    console.error("Get settings error:", error);
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
    console.error("Get setting error:", error);
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
    console.error("Update setting error:", error);
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
      console.error("Set required channel error:", error);
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
      console.error("Set greeting channel error:", error);
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
        enabled,
      });
    } catch (error) {
      console.error("Toggle required channel error:", error);
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
    console.error("Set about text error:", error);
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
      console.error("Set Ramadan date error:", error);
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
            : (await Settings.getSetting("reminder_settings"))?.enabled ?? true,
        defaultMinutes:
          typeof defaultMinutes === "number"
            ? defaultMinutes
            : (await Settings.getSetting("reminder_settings"))
                ?.defaultMinutes ?? 10,
        notifyAtPrayerTime:
          typeof notifyAtPrayerTime === "boolean"
            ? notifyAtPrayerTime
            : (await Settings.getSetting("reminder_settings"))
                ?.notifyAtPrayerTime ?? true,
        offerReminders:
          typeof offerReminders === "boolean"
            ? offerReminders
            : (await Settings.getSetting("reminder_settings"))
                ?.offerReminders ?? true,
      };

      await Settings.setSetting(
        "reminder_settings",
        reminderSettings,
        "Eslatma sozlamalari"
      );

      res.json({ message: "Eslatma sozlamalari saqlandi", reminderSettings });
    } catch (error) {
      console.error("Set reminder settings error:", error);
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
    console.error("Set prayers error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;
