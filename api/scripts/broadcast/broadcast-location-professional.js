const { Telegraf } = require("telegraf");
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Settings = require("./models/Settings");

const bot = new Telegraf(process.env.BOT_TOKEN);

// Telegram Rate Limits
const RATE_LIMIT = {
  MESSAGES_PER_SECOND: 30,
  MESSAGES_PER_MINUTE: 1500,
  DELAY_BETWEEN_BATCHES: 1000, // 1 second
  BATCH_SIZE: 25, // Send 25 messages per batch
  DELAY_BETWEEN_MESSAGES: 40, // 40ms = ~25 msg/sec
};

async function sendLocationRequestBroadcast() {
  try {
    console.log("\n" + "=".repeat(70));
    console.log("📍 PROFESSIONAL BROADCAST - LOCATION REQUEST");
    console.log("=".repeat(70) + "\n");

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

    // Default messages if not set
    const messages = {
      uz:
        messageUz ||
        `🕌 <b>Muhim xabar!</b>

Botimiz yangilandi va endi 232 ta O'zbekiston shahri uchun namoz vaqtlari mavjud!

⚠️ <b>Joylashuvingizni tanlang</b>
Namoz vaqtlarini olish uchun shaharingizni tanlashingiz kerak.

👇 Quyidagi tugmani bosing:`,

      ru:
        messageRu ||
        `🕌 <b>Важное сообщение!</b>

Наш бот обновлен и теперь доступно время намаза для 232 городов Узбекистана!

⚠️ <b>Выберите ваше местоположение</b>
Для получения времени намаза нужно выбрать ваш город.

👇 Нажмите кнопку:`,

      cr:
        messageCr ||
        `🕌 <b>Муҳим хабар!</b>

Ботимиз янгиланди ва энди 232 та Ўзбекистон шаҳри учун намоз вақтлари мавжуд!

⚠️ <b>Жойлашувингизни танланг</b>
Намоз вақтларини олиш учун шаҳарингизни танлашингиз керак.

👇 Қуйидаги тугмани босинг:`,
    };

    // Get users without location
    const usersWithoutLocation = await User.find({
      $or: [
        { "location.latitude": { $exists: false } },
        { "location.latitude": null },
      ],
      isActive: { $ne: false }, // Skip deactivated users
    })
      .select("userId firstName language")
      .lean();

    const totalUsers = usersWithoutLocation.length;
    console.log(`📊 Found ${totalUsers} users without location\n`);

    if (totalUsers === 0) {
      console.log("✅ All users have location set!");
      process.exit(0);
    }

    // Calculate estimates
    const estimatedTime = Math.ceil(
      (totalUsers * RATE_LIMIT.DELAY_BETWEEN_MESSAGES) / 1000
    ); // seconds
    const estimatedMinutes = Math.floor(estimatedTime / 60);

    console.log("⏱️  Estimated time:", estimatedMinutes, "minutes\n");
    console.log("🚀 Starting broadcast with rate limiting...\n");

    let sent = 0;
    let failed = 0;
    let blocked = 0;
    let startTime = Date.now();

    // Process in batches
    for (
      let i = 0;
      i < usersWithoutLocation.length;
      i += RATE_LIMIT.BATCH_SIZE
    ) {
      const batch = usersWithoutLocation.slice(i, i + RATE_LIMIT.BATCH_SIZE);

      // Send messages in batch
      const promises = batch.map(async (user) => {
        try {
          const lang = user.language || "uz";
          const message = messages[lang] || messages.uz;
          const reminderBtnText =
            lang === "ru"
              ? reminderBtnRu
              : lang === "cr"
                ? reminderBtnCr
                : reminderBtnUz;

          // Build keyboard dynamically based on settings
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

          await bot.telegram.sendMessage(user.userId, message, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: keyboard,
            },
          });

          sent++;

          // Small delay between messages in same batch
          await new Promise((resolve) =>
            setTimeout(resolve, RATE_LIMIT.DELAY_BETWEEN_MESSAGES)
          );

          return { success: true, userId: user.userId };
        } catch (error) {
          failed++;

          if (
            error.response?.error_code === 403 ||
            error.message.includes("bot was blocked") ||
            error.message.includes("user is deactivated")
          ) {
            blocked++;
            // Mark user as inactive
            await User.updateOne(
              { userId: user.userId },
              { isActive: false }
            ).catch(() => {});
          }

          return { success: false, userId: user.userId, error: error.message };
        }
      });

      await Promise.allSettled(promises);

      // Progress update
      const progress = Math.min(i + RATE_LIMIT.BATCH_SIZE, totalUsers);
      const percent = ((progress / totalUsers) * 100).toFixed(1);
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.floor(
        ((totalUsers - progress) * RATE_LIMIT.DELAY_BETWEEN_MESSAGES) / 1000
      );

      console.log(
        `   📤 ${progress}/${totalUsers} (${percent}%) | ✅ ${sent} | ❌ ${failed} | 🚫 ${blocked} | ⏱️  ${elapsed}s elapsed, ~${remaining}s remaining`
      );

      // Delay between batches to respect rate limits
      if (i + RATE_LIMIT.BATCH_SIZE < usersWithoutLocation.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, RATE_LIMIT.DELAY_BETWEEN_BATCHES)
        );
      }
    }

    const totalTime = Math.floor((Date.now() - startTime) / 1000);

    console.log("\n" + "=".repeat(70));
    console.log("✅ BROADCAST COMPLETED");
    console.log("=".repeat(70));
    console.log(`✅ Successfully sent: ${sent}`);
    console.log(`🚫 Blocked/deactivated: ${blocked}`);
    console.log(`❌ Other errors: ${failed - blocked}`);
    console.log(
      `⏱️  Total time: ${Math.floor(totalTime / 60)}m ${totalTime % 60}s`
    );
    console.log(`📊 Success rate: ${((sent / totalUsers) * 100).toFixed(1)}%`);
    console.log("=".repeat(70) + "\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n⚠️  Broadcast interrupted by user");
  await mongoose.disconnect();
  process.exit(0);
});

sendLocationRequestBroadcast();
