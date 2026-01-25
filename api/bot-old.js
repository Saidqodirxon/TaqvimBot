const { Telegraf, Scenes, session } = require("telegraf");
require("dotenv/config");
const db = require("./modules/db");

// Utils
const { t, getUserLanguage } = require("./utils/translator");
const {
  getLanguageKeyboard,
  getMainMenuKeyboard,
  getSettingsKeyboard,
  getAdminMainKeyboard,
  getRefreshKeyboard,
} = require("./utils/keyboards");
const {
  getOrCreateUser,
  updateUserLanguage,
  getUserStats,
  getPendingGreetings,
  updateGreetingStatus,
  getAllActiveUsers,
  toggleUserBlock,
} = require("./utils/database");
const {
  calculateTimeToRamadan,
  getCurrentTime,
  isAdmin,
  formatNumber,
  sleep,
} = require("./utils/helpers");
const { initializeDefaultLocations } = require("./utils/location");

// Scenes
const greetingScene = require("./scenes/greeting");
const suggestionScene = require("./scenes/suggestion");
const locationScene = require("./scenes/location");

// Initialize bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Environment variables
const adminId = process.env.ADMIN_ID;
const channelId = process.env.CHANNEL_ID;
const channelUser = process.env.CHANNEL_USER;
const botUser = process.env.BOT_USER;
const adminUser = process.env.ADMIN_USER;
const ramadanDate = process.env.RAMADAN_DATE || "2026-02-17";

// Stage setup
const stage = new Scenes.Stage([greetingScene, suggestionScene, locationScene]);

// Middleware
bot.use(session());
bot.use(stage.middleware());

// Middleware to load user data
bot.use(async (ctx, next) => {
  try {
    if (ctx.from) {
      const user = await getOrCreateUser(ctx);
      ctx.session.user = user;
    }
    await next();
  } catch (error) {
    console.error("Error in middleware:", error);
  }
});

// ========== COMMANDS ==========

/**
 * Start command
 */
bot.command("start", async (ctx) => {
  try {
    await ctx.scene.leave();
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    // Agar foydalanuvchi birinchi marta kirayotgan bo'lsa yoki tili default bo'lsa
    if (!user || (user.language === "uz" && !user.updated_at)) {
      // Til tanlash
      await ctx.reply(t(lang, "welcome"), {
        parse_mode: "HTML",
        ...getLanguageKeyboard(),
      });
    } else {
      // To'g'ridan-to'g'ri asosiy menyuga o'tish
      await ctx.reply(t(lang, "main_menu"), {
        parse_mode: "HTML",
        ...getMainMenuKeyboard(lang),
      });
    }
  } catch (error) {
    console.error("Error in start command:", error);
  }
});

/**
 * Admin command
 */
bot.command("admin", async (ctx) => {
  try {
    await ctx.scene.leave();

    if (!isAdmin(ctx.from.id)) {
      return await ctx.reply("❌ Siz admin emassiz!");
    }

    const stats = await getUserStats();

    const message =
      `👨‍💼 Admin Panel\n\n` +
      `📊 Statistika:\n` +
      `• Jami foydalanuvchilar: ${formatNumber(stats.total)}\n` +
      `• Faol: ${formatNumber(stats.active)}\n` +
      `• Bloklangan: ${formatNumber(stats.blocked)}\n\n` +
      `Tillar:\n` +
      stats.languages
        .map((l) => `• ${l._id}: ${formatNumber(l.count)}`)
        .join("\n");

    await ctx.reply(message, {
      ...getAdminMainKeyboard(),
    });
  } catch (error) {
    console.error("Error in admin command:", error);
    await ctx.reply("❌ Xatolik yuz berdi");
  }
});

/**
 * Stats command
 */
bot.command("stat", async (ctx) => {
  try {
    if (!isAdmin(ctx.from.id)) {
      return await ctx.reply("❌ Siz admin emassiz!");
    }

    const stats = await getUserStats();
    const pendingGreetings = await getPendingGreetings();

    const message =
      `📊 Bot statistikasi:\n\n` +
      `👥 Foydalanuvchilar:\n` +
      `• Jami: ${formatNumber(stats.total)}\n` +
      `• Faol: ${formatNumber(stats.active)}\n` +
      `• Bloklangan: ${formatNumber(stats.blocked)}\n\n` +
      `🌐 Tillar:\n` +
      stats.languages
        .map((l) => {
          const langName =
            l._id === "uz" ? "O'zbek" : l._id === "cr" ? "Ўзбек" : "Русский";
          return `• ${langName}: ${formatNumber(l.count)}`;
        })
        .join("\n") +
      `\n\n💌 Kutilayotgan tabriklar: ${pendingGreetings.length}`;

    await ctx.reply(message);
  } catch (error) {
    console.error("Error in stat command:", error);
    await ctx.reply("❌ Xatolik yuz berdi");
  }
});

/**
 * Broadcast command
 */
bot.command("send", async (ctx) => {
  try {
    await ctx.scene.leave();

    if (!isAdmin(ctx.from.id)) {
      return await ctx.reply("❌ Siz admin emassiz!");
    }

    ctx.session.broadcastMode = true;
    await ctx.reply(
      "✉️ Barcha foydalanuvchilarga yubormoqchi bo'lgan xabaringizni yuboring:\n\n" +
        "Xabar matn, rasm, video yoki boshqa formatda bo'lishi mumkin.\n\n" +
        "/cancel - Bekor qilish"
    );
  } catch (error) {
    console.error("Error in send command:", error);
    await ctx.reply("❌ Xatolik yuz berdi");
  }
});

bot.command("cancel", async (ctx) => {
  if (ctx.session.broadcastMode) {
    ctx.session.broadcastMode = false;
    await ctx.reply("✅ Bekor qilindi", {
      ...getAdminMainKeyboard(),
    });
  }
});

// ========== LANGUAGE SELECTION ==========

bot.action("lang_uz", async (ctx) => {
  try {
    await ctx.answerCbQuery("✅ Til o'zgartirildi");
    await updateUserLanguage(ctx.from.id, "uz");
    ctx.session.user.language = "uz";

    await ctx.editMessageText(
      `✅ ${t("uz", "language_set")}\n\n${t("uz", "main_menu")}`
    );
    await ctx.reply(t("uz", "main_menu"), {
      ...getMainMenuKeyboard("uz"),
    });
  } catch (error) {
    console.error("Error setting language uz:", error);
  }
});

bot.action("lang_cr", async (ctx) => {
  try {
    await ctx.answerCbQuery("✅ Тил ўзгартирилди");
    await updateUserLanguage(ctx.from.id, "cr");
    ctx.session.user.language = "cr";

    await ctx.editMessageText(
      `✅ ${t("cr", "language_set")}\n\n${t("cr", "main_menu")}`
    );
    await ctx.reply(t("cr", "main_menu"), {
      ...getMainMenuKeyboard("cr"),
    });
  } catch (error) {
    console.error("Error setting language cr:", error);
  }
});

bot.action("lang_ru", async (ctx) => {
  try {
    await ctx.answerCbQuery("✅ Язык изменен");
    await updateUserLanguage(ctx.from.id, "ru");
    ctx.session.user.language = "ru";

    await ctx.editMessageText(
      `✅ ${t("ru", "language_set")}\n\n${t("ru", "main_menu")}`
    );
    await ctx.reply(t("ru", "main_menu"), {
      ...getMainMenuKeyboard("ru"),
    });
  } catch (error) {
    console.error("Error setting language ru:", error);
  }
});

// ========== MAIN MENU HANDLERS ==========

// Calendar
bot.hears(/📅|Тақвим|Календарь/, async (ctx) => {
  try {
    const user = ctx.session.user;
    const lang = getUserLanguage(user);
    const location = user.location || "Toshkent";

    const axios = require("axios");
    const moment = require("moment-timezone");
    const ISLOM_API_LINK = "http://islomapi.uz/api";

    try {
      // Get current month number (1-12)
      const currentMonth = moment().tz("Asia/Tashkent").month() + 1;

      // Normalize region name to match API format
      const normalizedRegion = normalizeRegionName(location);

      const response = await axios.get(
        `${ISLOM_API_LINK}/present/month?region=${normalizedRegion}`,
        {
          timeout: 10000,
          headers: {
            "User-Agent": "RamazonBot/1.0",
          },
        }
      );

      const data = response.data;

      let message = `📅 ${t(lang, "calendar_title")}\n\n`;
      message += `📍 ${location}\n\n`;

      if (data && Array.isArray(data) && data.length > 0) {
        // Show next 5 days
        data.slice(0, 5).forEach((day, index) => {
          message += `📆 ${day.date || day.hijri_date}\n`;
          message += `🌅 Saharlik: ${
            day.times?.tongSaharlik || day.times?.fajr || "N/A"
          }\n`;
          message += `☀️ Quyosh: ${
            day.times?.quyosh || day.times?.sunrise || "N/A"
          }\n`;
          message += `🌆 Iftor: ${
            day.times?.shomIftor || day.times?.maghrib || "N/A"
          }\n\n`;
        });
      } else if (data && data.times) {
        // Single day response
        message += `� Bugun\n`;
        message += `🌅 Saharlik: ${
          data.times.tongSaharlik || data.times.fajr || "N/A"
        }\n`;
        message += `☀️ Quyosh: ${
          data.times.quyosh || data.times.sunrise || "N/A"
        }\n`;
        message += `� Iftor: ${
          data.times.shomIftor || data.times.maghrib || "N/A"
        }\n`;
      } else {
        message += `⚠️ ${t(lang, "error_try_again")}`;
      }

      await ctx.reply(message);
    } catch (error) {
      console.error("Error fetching calendar:", error.message);

      // Fallback response
      await ctx.reply(
        `❌ Taqvim ma'lumotlarini olishda xatolik.\n\n` +
          `Iltimos, keyinroq urinib ko'ring yoki joylashuvingizni tekshiring.\n\n` +
          `Hozirgi joylashuv: ${location}`
      );
    }
  } catch (error) {
    console.error("Error in calendar handler:", error);
  }
});

/**
 * Normalize region name for API
 */
function normalizeRegionName(region) {
  // API accepts these formats
  const regionMap = {
    Toshkent: "Tashkent",
    "Toshkent shahri": "Tashkent",
    Samarqand: "Samarkand",
    "Samarqand shahri": "Samarkand",
    Buxoro: "Bukhara",
    Andijon: "Andijan",
    "Farg'ona": "Fergana",
    Fargona: "Fergana",
    Namangan: "Namangan",
    "Qo'qon": "Kokand",
    Qoqon: "Kokand",
    "Marg'ilon": "Margilan",
    Margilon: "Margilan",
    Nukus: "Nukus",
    Urganch: "Urgench",
    Xiva: "Khiva",
    Qarshi: "Karshi",
    Termiz: "Termez",
    Jizzax: "Jizzakh",
    Guliston: "Gulistan",
    Navoiy: "Navoi",
    Angren: "Angren",
    Chirchiq: "Chirchik",
    Bekobod: "Bekabad",
    Olmaliq: "Almalyk",
  };

  return regionMap[region] || region;
}

// Send Greeting
bot.hears(/💌|Табрик|Поздравление/, async (ctx) => {
  try {
    await ctx.scene.enter("greeting");
  } catch (error) {
    console.error("Error entering greeting scene:", error);
  }
});

// Ramadan Countdown
bot.hears(/⏰|Рамазонга|Рамазана/, async (ctx) => {
  try {
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    const remaining = calculateTimeToRamadan(ramadanDate);
    const current = getCurrentTime();

    const message = t(lang, "ramadan_countdown", {
      days: remaining.remainingDays,
      hours: remaining.remainingHours,
      minutes: remaining.remainingMinutes,
      seconds: remaining.remainingSeconds,
      date: current.currentDate,
      time: current.currentTime,
    });

    await ctx.reply(message, {
      ...getRefreshKeyboard(lang),
    });
  } catch (error) {
    console.error("Error in countdown handler:", error);
  }
});

// Location
bot.hears(/📍|Жойлашув|Местоположение/, async (ctx) => {
  try {
    await ctx.scene.enter("location");
  } catch (error) {
    console.error("Error entering location scene:", error);
  }
});

// Suggestion
bot.hears(/💡|Таклиф|Предложение/, async (ctx) => {
  try {
    await ctx.scene.enter("suggestion");
  } catch (error) {
    console.error("Error entering suggestion scene:", error);
  }
});

// About
bot.hears(/ℹ️|ҳақида|боте/, async (ctx) => {
  try {
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    const message = t(lang, "about_bot", { admin: adminUser });

    await ctx.reply(message, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📱 Instagram",
              url: `https://instagram.com/${process.env.INSTAGRAM_USER || ""}`,
            },
            {
              text: "📺 YouTube",
              url: `https://youtube.com/@${process.env.YOUTUBE_USER || ""}`,
            },
          ],
          [
            {
              text: "🎵 TikTok",
              url: `https://tiktok.com/@${process.env.TIKTOK_USER || ""}`,
            },
          ],
          [
            Markup.button.callback(
              "⚙️ " + t(lang, "btn_settings"),
              "open_settings"
            ),
          ],
        ],
      },
    });
  } catch (error) {
    console.error("Error in about handler:", error);
  }
});

// Back button
bot.hears(/◀️|Орқага|Назад/, async (ctx) => {
  try {
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    await ctx.reply(t(lang, "main_menu"), {
      ...getMainMenuKeyboard(lang),
    });
  } catch (error) {
    console.error("Error in back handler:", error);
  }
});

// ========== ADMIN HANDLERS ==========

// Admin main menu handlers
bot.hears("📊 Statistika", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  try {
    const stats = await getUserStats();
    const pendingGreetings = await getPendingGreetings();

    const message =
      `📊 Batafsil statistika:\n\n` +
      `👥 Foydalanuvchilar:\n` +
      `• Jami: ${formatNumber(stats.total)}\n` +
      `• Faol: ${formatNumber(stats.active)}\n` +
      `• Bloklangan: ${formatNumber(stats.blocked)}\n\n` +
      `🌐 Tillar bo'yicha:\n` +
      stats.languages
        .map((l) => {
          const langName =
            l._id === "uz"
              ? "O'zbek (Lotin)"
              : l._id === "cr"
              ? "O'zbek (Kiril)"
              : "Русский";
          const percent = ((l.count / stats.total) * 100).toFixed(1);
          return `• ${langName}: ${formatNumber(l.count)} (${percent}%)`;
        })
        .join("\n") +
      `\n\n💌 Kutilayotgan tabriklar: ${pendingGreetings.length}`;

    await ctx.reply(message);
  } catch (error) {
    console.error("Error in statistics:", error);
    await ctx.reply("❌ Xatolik yuz berdi");
  }
});

bot.hears("💌 Tabriklar", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  try {
    const pendingGreetings = await getPendingGreetings();

    if (pendingGreetings.length === 0) {
      return await ctx.reply("✅ Kutilayotgan tabriklar yo'q");
    }

    await ctx.reply(
      `💌 Kutilayotgan tabriklar: ${pendingGreetings.length}\n\nBirinchi tabrikni ko'rsatyapman...`
    );

    const greeting = pendingGreetings[0];
    const message = `💌 Tabrik:\n\n👤 ${greeting.firstName} (@${
      greeting.username || "yo'q"
    })\n🆔 ${greeting.userId}\n\n${greeting.message}`;

    if (greeting.messageType === "photo") {
      await ctx.replyWithPhoto(greeting.fileId, {
        caption: message,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ Tasdiqlash",
                callback_data: `approve_${greeting._id}`,
              },
              { text: "❌ Rad etish", callback_data: `reject_${greeting._id}` },
            ],
          ],
        },
      });
    } else if (greeting.messageType === "video") {
      await ctx.replyWithVideo(greeting.fileId, {
        caption: message,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ Tasdiqlash",
                callback_data: `approve_${greeting._id}`,
              },
              { text: "❌ Rad etish", callback_data: `reject_${greeting._id}` },
            ],
          ],
        },
      });
    } else {
      await ctx.reply(message, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ Tasdiqlash",
                callback_data: `approve_${greeting._id}`,
              },
              { text: "❌ Rad etish", callback_data: `reject_${greeting._id}` },
            ],
          ],
        },
      });
    }
  } catch (error) {
    console.error("Error showing greetings:", error);
    await ctx.reply("❌ Xatolik yuz berdi");
  }
});

bot.hears("✉️ Xabar yuborish", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  ctx.session.broadcastMode = true;
  await ctx.reply(
    "✉️ Barcha foydalanuvchilarga yubormoqchi bo'lgan xabaringizni yuboring:\n\n" +
      "Xabar matn, rasm, video yoki boshqa formatda bo'lishi mumkin.\n\n" +
      "Bekor qilish uchun /cancel ni yuboring"
  );
});

bot.hears("🔙 Chiqish", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  const user = ctx.session.user;
  const lang = getUserLanguage(user);

  await ctx.reply(t(lang, "main_menu"), {
    ...getMainMenuKeyboard(lang),
  });
});

// ========== GREETING APPROVAL ==========

bot.action(/approve_(.+)/, async (ctx) => {
  try {
    await ctx.answerCbQuery("✅ Tasdiqlanmoqda...");

    if (!isAdmin(ctx.from.id)) {
      return await ctx.answerCbQuery("❌ Ruxsat yo'q", { show_alert: true });
    }

    const greetingId = ctx.match[1];
    const greeting = await updateGreetingStatus(greetingId, "approved");

    if (!greeting) {
      return await ctx.answerCbQuery("❌ Tabrik topilmadi", {
        show_alert: true,
      });
    }

    // Send to channel
    const channelMessage = `${greeting.message}\n\n💌 Tabrik yuborish: @${botUser}`;

    try {
      if (greeting.messageType === "photo") {
        await ctx.telegram.sendPhoto(channelId, greeting.fileId, {
          caption: channelMessage,
        });
      } else if (greeting.messageType === "video") {
        await ctx.telegram.sendVideo(channelId, greeting.fileId, {
          caption: channelMessage,
        });
      } else {
        await ctx.telegram.sendMessage(channelId, channelMessage);
      }

      // Notify user
      const User = require("./models/User");
      const user = await User.findOne({ userId: greeting.userId });
      const lang = getUserLanguage(user);

      await ctx.telegram.sendMessage(
        greeting.userId,
        t(lang, "greeting_approved")
      );

      await ctx.editMessageText(
        ctx.callbackQuery.message.text +
          "\n\n✅ Tasdiqlandi va kanalga yuborildi!"
      );
    } catch (error) {
      console.error("Error sending to channel:", error);
      await ctx.answerCbQuery("❌ Kanalga yuborishda xatolik", {
        show_alert: true,
      });
    }
  } catch (error) {
    console.error("Error approving greeting:", error);
    await ctx.answerCbQuery("❌ Xatolik yuz berdi", { show_alert: true });
  }
});

bot.action(/reject_(.+)/, async (ctx) => {
  try {
    await ctx.answerCbQuery("❌ Rad etilmoqda...");

    if (!isAdmin(ctx.from.id)) {
      return await ctx.answerCbQuery("❌ Ruxsat yo'q", { show_alert: true });
    }

    const greetingId = ctx.match[1];
    const greeting = await updateGreetingStatus(greetingId, "rejected");

    if (!greeting) {
      return await ctx.answerCbQuery("❌ Tabrik topilmadi", {
        show_alert: true,
      });
    }

    // Notify user
    const User = require("./models/User");
    const user = await User.findOne({ userId: greeting.userId });
    const lang = getUserLanguage(user);

    await ctx.telegram.sendMessage(
      greeting.userId,
      t(lang, "greeting_rejected")
    );

    await ctx.editMessageText(
      ctx.callbackQuery.message.text + "\n\n❌ Rad etildi!"
    );
  } catch (error) {
    console.error("Error rejecting greeting:", error);
    await ctx.answerCbQuery("❌ Xatolik yuz berdi", { show_alert: true });
  }
});

// ========== REFRESH COUNTDOWN ==========

bot.action("refresh_countdown", async (ctx) => {
  try {
    await ctx.answerCbQuery("🔄 Yangilanmoqda...");

    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    const remaining = calculateTimeToRamadan(ramadanDate);
    const current = getCurrentTime();

    const message = t(lang, "ramadan_countdown", {
      days: remaining.remainingDays,
      hours: remaining.remainingHours,
      minutes: remaining.remainingMinutes,
      seconds: remaining.remainingSeconds,
      date: current.currentDate,
      time: current.currentTime,
    });

    await ctx.editMessageText(message, {
      ...getRefreshKeyboard(lang),
    });
  } catch (error) {
    console.error("Error refreshing countdown:", error);
  }
});

bot.action("back_main", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    await ctx.editMessageText(t(lang, "main_menu"));
    await ctx.reply(t(lang, "main_menu"), {
      ...getMainMenuKeyboard(lang),
    });
  } catch (error) {
    console.error("Error in back_main:", error);
  }
});

// ========== SETTINGS INLINE ==========

bot.action("open_settings", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const user = ctx.session.user;
    const lang = getUserLanguage(user);
    const { getSettingsInlineKeyboard } = require("./utils/keyboards");

    await ctx.editMessageText(
      `⚙️ ${t(lang, "btn_settings")}\n\n` +
        `🌐 Hozirgi til: ${
          lang === "uz" ? "O'zbek" : lang === "cr" ? "Ўзбек" : "Русский"
        }\n` +
        `📍 Joylashuv: ${user.location || "Tanlanmagan"}`,
      {
        ...getSettingsInlineKeyboard(lang),
      }
    );
  } catch (error) {
    console.error("Error in open_settings:", error);
  }
});

bot.action("change_lang", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    await ctx.editMessageText(t(lang, "choose_language"), {
      ...getLanguageKeyboard(),
    });
  } catch (error) {
    console.error("Error in change_lang:", error);
  }
});

// ========== BROADCAST ==========

bot.on("message", async (ctx) => {
  try {
    // Check if admin is in broadcast mode
    if (ctx.session.broadcastMode && isAdmin(ctx.from.id)) {
      const users = await getAllActiveUsers();

      await ctx.reply(
        `📤 Xabar yuborilmoqda ${formatNumber(
          users.length
        )} ta foydalanuvchiga...`
      );

      let successCount = 0;
      let failureCount = 0;

      for (const user of users) {
        try {
          await ctx.telegram.copyMessage(
            user.userId,
            ctx.chat.id,
            ctx.message.message_id
          );
          successCount++;

          // Add delay to avoid rate limits
          if (successCount % 20 === 0) {
            await sleep(1000);
          }
        } catch (error) {
          console.error(`Error sending to user ${user.userId}:`, error);
          failureCount++;
        }
      }

      ctx.session.broadcastMode = false;

      await ctx.reply(
        `✅ Xabar yuborildi!\n\n` +
          `✅ Muvaffaqiyatli: ${formatNumber(successCount)}\n` +
          `❌ Xatolik: ${formatNumber(failureCount)}`,
        {
          ...getAdminMainKeyboard(),
        }
      );

      return;
    }

    // Handle other messages
    const user = ctx.session.user;
    const lang = getUserLanguage(user);
    await ctx.reply(t(lang, "error_unknown_command"));
  } catch (error) {
    console.error("Error in message handler:", error);
  }
});

// ========== ERROR HANDLING ==========

bot.catch((error, ctx) => {
  console.error("Bot error:", error);
  try {
    const user = ctx.session?.user;
    const lang = getUserLanguage(user);
    ctx.reply(t(lang, "error_try_again"));
  } catch (e) {
    console.error("Error sending error message:", e);
  }
});

// ========== START BOT ==========

async function startBot() {
  try {
    console.log("🚀 Starting bot...\n");

    // Connect to database
    console.log("📦 Connecting to database...");
    await db();

    // Wait a bit for connection to stabilize
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Initialize default locations
    console.log("📍 Initializing locations...");
    const locationsInitialized = await initializeDefaultLocations();

    if (!locationsInitialized) {
      console.log("⚠️  Locations not initialized, but continuing...");
    }

    // Launch bot
    console.log("🤖 Launching bot...");
    await bot.launch();
    console.log("\n✅ Bot started successfully!");
    console.log(`📱 Bot username: @${botUser}`);
    console.log(`👨‍💼 Admin ID: ${adminId}`);
    console.log("\n🎉 Bot is ready to use!\n");
  } catch (error) {
    console.error("\n❌ Error starting bot:", error.message);
    console.error("\n💡 Mumkin sabablari:");
    console.error("   1. MongoDB ishlamayapti");
    console.error("   2. .env fayl noto'g'ri to'ldirilgan");
    console.error("   3. Internet ulanishi yo'q");
    console.error("   4. BOT_TOKEN noto'g'ri\n");
    process.exit(1);
  }
}

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

// Start the bot
startBot();

module.exports = bot;
