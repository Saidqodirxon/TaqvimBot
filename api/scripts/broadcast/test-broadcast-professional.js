const { Telegraf } = require("telegraf");
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Settings = require("./models/Settings");

const bot = new Telegraf(process.env.BOT_TOKEN);

async function sendTestToAdmin() {
  try {
    console.log("\n📨 Testing broadcast message to admin...\n");

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ MongoDB connected\n");

    // Get broadcast messages from settings
    const [
      messageUz,
      messageRu,
      messageCr,
      restartBtnText,
      reminderBtnUz,
      reminderBtnRu,
      reminderBtnCr,
      showLocationBtn,
      showReminderBtn,
      showRestartBtn,
    ] = await Promise.all([
      Settings.getSetting("broadcast_location_message_uz", null),
      Settings.getSetting("broadcast_location_message_ru", null),
      Settings.getSetting("broadcast_location_message_cr", null),
      Settings.getSetting(
        "broadcast_restart_button_text",
        "🔄 Botni qayta ishga tushirish"
      ),
      Settings.getSetting(
        "broadcast_reminder_button_text_uz",
        "🔔 Eslatmalarni yoqish"
      ),
      Settings.getSetting(
        "broadcast_reminder_button_text_ru",
        "🔔 Включить напоминания"
      ),
      Settings.getSetting(
        "broadcast_reminder_button_text_cr",
        "🔔 Эслатмаларни ёқиш"
      ),
      Settings.getSetting("broadcast_show_location_button", true),
      Settings.getSetting("broadcast_show_reminder_button", true),
      Settings.getSetting("broadcast_show_restart_button", true),
    ]);

    console.log("📝 Loaded settings:\n");
    console.log("✅ Uzbek message:", messageUz ? "✓" : "✗");
    console.log("✅ Russian message:", messageRu ? "✓" : "✗");
    console.log("✅ Cyrillic message:", messageCr ? "✓" : "✗");
    console.log("✅ Restart button:", restartBtnText);
    console.log("📋 Button visibility:");
    console.log("  - Location:", showLocationBtn ? "✓" : "✗");
    console.log("  - Reminder:", showReminderBtn ? "✓" : "✗");
    console.log("  - Restart:", showRestartBtn ? "✓" : "✗", "\n");

    // Get admin user
    const admin = await User.findOne({ isAdmin: true });
    if (!admin) {
      console.log("❌ No admin user found");
      process.exit(1);
    }

    console.log(`👤 Admin: ${admin.firstName} (ID: ${admin.userId})\n`);

    const messages = {
      uz: messageUz,
      ru: messageRu,
      cr: messageCr,
    };

    const lang = admin.language || "uz";
    const message = messages[lang] || messages.uz;
    const reminderBtnText =
      lang === "ru"
        ? reminderBtnRu
        : lang === "cr"
          ? reminderBtnCr
          : reminderBtnUz;

    console.log(`🌐 Language: ${lang}\n`);
    console.log("📤 Sending message...\n");

    // Build keyboard dynamically
    const keyboard = [];

    if (showLocationBtn) {
      keyboard.push([
        {
          text: "📍 Joylashuvni tanlash",
          callback_data: "enter_location_scene",
        },
      ]);
    }

    if (showReminderBtn) {
      keyboard.push([
        {
          text: reminderBtnText,
          callback_data: "enable_reminders_from_broadcast",
        },
      ]);
    }

    if (showRestartBtn) {
      keyboard.push([
        {
          text: restartBtnText,
          callback_data: "restart_bot",
        },
      ]);
    }

    await bot.telegram.sendMessage(admin.userId, message, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });

    console.log("✅ Message sent successfully!\n");
    console.log("=".repeat(70));
    console.log("🎉 TEST COMPLETED");
    console.log("=".repeat(70) + "\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

sendTestToAdmin();
