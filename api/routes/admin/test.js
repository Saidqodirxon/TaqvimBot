const logger = require("../../utils/logger");
const express = require("express");
const router = express.Router();
const adminAuth = require("../../middleware/adminAuth");
const { Telegraf } = require("telegraf");
const User = require("../../models/User");
const Settings = require("../../models/Settings");

const bot = new Telegraf(process.env.BOT_TOKEN);

/**
 * Test bot connection
 */
router.post("/bot-connection", adminAuth, async (req, res) => {
  try {
    const me = await bot.telegram.getMe();
    res.json({
      success: true,
      message: "Bot ishlayapti",
      bot: {
        id: me.id,
        username: me.username,
        firstName: me.first_name,
      },
    });
  } catch (error) {
    logger.error("Test bot connection error:", error);
    res.status(500).json({
      success: false,
      error: "Bot bilan bog'lanishda xatolik",
      details: error.message,
    });
  }
});

/**
 * Test database connection
 */
router.post("/database", adminAuth, async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const isConnected = mongoose.connection.readyState === 1;

    if (!isConnected) {
      return res.status(503).json({
        success: false,
        error: "Database bilan bog'lanmagan",
      });
    }

    // Test query
    const userCount = await User.countDocuments();

    res.json({
      success: true,
      message: "Database ishlayapti",
      database: {
        name: mongoose.connection.db.databaseName,
        host: mongoose.connection.host,
        userCount,
      },
    });
  } catch (error) {
    logger.error("Test database error:", error);
    res.status(500).json({
      success: false,
      error: "Database test xatosi",
      details: error.message,
    });
  }
});

/**
 * Send test message to admin
 */
router.post("/send-test-message", adminAuth, async (req, res) => {
  try {
    const adminId = process.env.ADMIN_ID;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        error: "ADMIN_ID not configured",
      });
    }

    await bot.telegram.sendMessage(
      adminId,
      `🧪 <b>Test Message</b>\n\nBot ishlayapti va xabar yuborish funksiyasi faol!\n\n⏰ ${new Date().toLocaleString("uz-UZ")}`,
      { parse_mode: "HTML" }
    );

    await logger.logAdminAction(
      { userId: req.user?.id, firstName: "Admin" },
      "Test xabar yuborildi",
      "Admin ID ga"
    );

    res.json({
      success: true,
      message: "Test xabar adminga yuborildi",
    });
  } catch (error) {
    logger.error("Send test message error:", error);
    res.status(500).json({
      success: false,
      error: "Xabar yuborishda xatolik",
      details: error.message,
    });
  }
});

/**
 * Test log channel
 */
router.post("/log-channel", adminAuth, async (req, res) => {
  try {
    const logChannel = await Settings.getSetting("log_channel", null);

    if (!logChannel) {
      return res.status(400).json({
        success: false,
        error: "Log channel sozlanmagan",
      });
    }

    await bot.telegram.sendMessage(
      logChannel,
      `🧪 <b>Test Log Message</b>\n\nLog channel ishlayapti!\n\n⏰ ${new Date().toLocaleString("uz-UZ")}`,
      { parse_mode: "HTML" }
    );

    res.json({
      success: true,
      message: "Test log yuborildi",
      logChannel,
    });
  } catch (error) {
    logger.error("Test log channel error:", error);
    res.status(500).json({
      success: false,
      error: "Log channel test xatosi",
      details: error.message,
    });
  }
});

/**
 * Test greeting channel
 */
router.post("/greeting-channel", adminAuth, async (req, res) => {
  try {
    const greetingChannel = await Settings.getSetting("greeting_channel", null);

    if (!greetingChannel) {
      return res.status(400).json({
        success: false,
        error: "Greeting channel sozlanmagan",
      });
    }

    await bot.telegram.sendMessage(
      greetingChannel,
      `🧪 <b>Test Greeting Message</b>\n\nGreeting channel ishlayapti!\n\n⏰ ${new Date().toLocaleString("uz-UZ")}`,
      { parse_mode: "HTML" }
    );

    res.json({
      success: true,
      message: "Test greeting yuborildi",
      greetingChannel,
    });
  } catch (error) {
    logger.error("Test greeting channel error:", error);
    res.status(500).json({
      success: false,
      error: "Greeting channel test xatosi",
      details: error.message,
    });
  }
});

/**
 * Test translation system
 */
router.post("/translations", adminAuth, async (req, res) => {
  try {
    const Translation = require("../../models/Translation");
    const { clearTranslationCache } = require("../../utils/translator");

    const count = await Translation.countDocuments();

    // Clear cache to test database loading
    clearTranslationCache();

    res.json({
      success: true,
      message: "Translation system ishlayapti",
      translationCount: count,
      cacheCleared: true,
    });
  } catch (error) {
    logger.error("Test translations error:", error);
    res.status(500).json({
      success: false,
      error: "Translation test xatosi",
      details: error.message,
    });
  }
});

/**
 * Test backup creation
 */
router.post("/backup", adminAuth, async (req, res) => {
  try {
    // Only superadmin can create backups
    if (req.user.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        error: "Faqat superadmin backup yarata oladi",
      });
    }

    const { createBackup } = require("../../scripts/maintenance/backup-mongodb");

    // Run backup in background
    createBackup()
      .then(() => {
        logger.logAdminAction(
          { userId: req.user?.id, firstName: "Admin" },
          "Test backup yaratildi",
          "Manual test"
        );
      })
      .catch((error) => {
        logger.error("Backup test failed:", error);
      });

    res.json({
      success: true,
      message: "Backup jarayoni boshlandi (background)",
      note: "Natija log kanalda ko'rinadi",
    });
  } catch (error) {
    logger.error("Test backup error:", error);
    res.status(500).json({
      success: false,
      error: "Backup test xatosi",
      details: error.message,
    });
  }
});

/**
 * Send test message with inline buttons
 */
router.post("/send-test-message-buttons", adminAuth, async (req, res) => {
  try {
    const adminId = process.env.ADMIN_ID;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        error: "ADMIN_ID not configured",
      });
    }

    await bot.telegram.sendMessage(
      adminId,
      `🧪 <b>Tugmali Test Xabar</b>\n\nInline tugmalarni tekshirish:\n\n⏰ ${new Date().toLocaleString("uz-UZ")}`,
      { 
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📍 Joylashuvni tanlash", callback_data: "enter_location_scene" }],
            [{ text: "🔔 Eslatmalarni yoqish", callback_data: "enable_reminders_from_broadcast" }],
            [{ text: "📅 Bugungi vaqtlar", callback_data: "today_times" }],
          ]
        }
      }
    );

    res.json({
      success: true,
      message: "Tugmali test xabar adminga yuborildi",
    });
  } catch (error) {
    logger.error("Send test message with buttons error:", error);
    res.status(500).json({
      success: false,
      error: "Xabar yuborishda xatolik",
      details: error.message,
    });
  }
});

/**
 * Test prayer times API
 */
router.post("/prayer-times", adminAuth, async (req, res) => {
  try {
    const { getPrayerTimes } = require("../../utils/aladhan");
    
    // Test with Tashkent coordinates
    const prayerData = await getPrayerTimes(41.2995, 69.2401);

    if (!prayerData || !prayerData.success) {
      return res.status(500).json({
        success: false,
        error: "Namoz vaqtlarini olishda xatolik",
      });
    }

    res.json({
      success: true,
      message: "Prayer times API ishlayapti",
      prayerTimes: prayerData.timings,
      source: prayerData.manual ? "Manual" : prayerData.source || "Aladhan API",
    });
  } catch (error) {
    logger.error("Test prayer times error:", error);
    res.status(500).json({
      success: false,
      error: "Prayer times test xatosi",
      details: error.message,
    });
  }
});

/**
 * Test locations
 */
router.post("/locations", adminAuth, async (req, res) => {
  try {
    const Location = require("../../models/Location");
    
    const count = await Location.countDocuments({ isActive: true });
    const defaultLocation = await Location.findOne({ isDefault: true });

    res.json({
      success: true,
      message: "Locations ishlayapti",
      locationsCount: count,
      defaultLocation: defaultLocation?.name || "Yo'q",
    });
  } catch (error) {
    logger.error("Test locations error:", error);
    res.status(500).json({
      success: false,
      error: "Locations test xatosi",
      details: error.message,
    });
  }
});

/**
 * Test reminders system
 */
router.post("/reminders", adminAuth, async (req, res) => {
  try {
    const reminderUsers = await User.countDocuments({
      "reminderSettings.enabled": true,
      is_block: false,
    });

    res.json({
      success: true,
      message: "Reminders system ishlayapti",
      reminderUsers,
    });
  } catch (error) {
    logger.error("Test reminders error:", error);
    res.status(500).json({
      success: false,
      error: "Reminders test xatosi",
      details: error.message,
    });
  }
});

/**
 * Send custom test message
 */
router.post("/send-custom-message", adminAuth, async (req, res) => {
  try {
    const { message } = req.body;
    const adminId = process.env.ADMIN_ID;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        error: "ADMIN_ID not configured",
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Xabar matni kerak",
      });
    }

    await bot.telegram.sendMessage(adminId, message, { parse_mode: "HTML" });

    res.json({
      success: true,
      message: "Maxsus test xabar yuborildi",
    });
  } catch (error) {
    logger.error("Send custom message error:", error);
    res.status(500).json({
      success: false,
      error: "Xabar yuborishda xatolik",
      details: error.message,
    });
  }
});

module.exports = router;
