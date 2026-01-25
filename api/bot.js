const { Telegraf, Scenes, session, Markup } = require("telegraf");
require("dotenv/config");

// Set timezone to Uzbekistan
process.env.TZ = "Asia/Tashkent";

const db = require("./modules/db");

// Models
const User = require("./models/User");
const Settings = require("./models/Settings");
const Prayer = require("./models/Prayer");
const MessageQueue = require("./modules/messageQueue");

// Utils
const { t, getUserLanguage } = require("./utils/translator");
const {
  getLanguageKeyboard,
  getMainMenuKeyboard,
  getCalendarViewKeyboard,
  getReminderSettingsKeyboard,
  getPhoneRequestKeyboard,
  getLocationSettingsKeyboard,
  getSettingsInlineKeyboard,
  getPrayersKeyboard,
} = require("./utils/keyboards");
const { getOrCreateUser, updateUserLanguage } = require("./utils/database");
const {
  calculateTimeToRamadan,
  getCurrentTime,
  isAdmin,
} = require("./utils/helpers");
const {
  getPrayerTimes,
  getNextPrayer,
  getQiblaDirection,
  CALCULATION_METHODS,
  SCHOOLS,
} = require("./utils/aladhan");
const {
  checkChannelMembership,
  handleCheckSubscription,
} = require("./utils/channel");
const {
  schedulePrayerReminders,
  initializeAllReminders,
  updateUserReminders,
} = require("./utils/prayerReminders");
const logger = require("./utils/logger");
const { initErrorLogger, logError } = require("./utils/errorLogger");

// Scenes
const greetingScene = require("./scenes/greeting");
const suggestionScene = require("./scenes/suggestion");
const locationScene = require("./scenes/location");
const settingsScene = require("./scenes/settings");

// Initialize bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Environment variables
const adminId = process.env.ADMIN_ID;
const botUser = process.env.BOT_USER;
const adminUser = process.env.ADMIN_USER;
const ramadanDate = process.env.RAMADAN_DATE || "2026-02-17";

// Stage setup
const stage = new Scenes.Stage([
  greetingScene,
  suggestionScene,
  locationScene,
  settingsScene,
]);

// Middleware
bot.use(session());
bot.use(stage.middleware());

// Middleware to load user data
bot.use(async (ctx, next) => {
  try {
    if (ctx.from) {
      const user = await getOrCreateUser(ctx);
      ctx.session.user = user;

      // Update last_active timestamp
      await User.updateOne(
        { userId: ctx.from.id },
        { $set: { last_active: new Date() } }
      );

      // Bloklangan foydalanuvchilarni tekshirish
      if (user.is_block) {
        const lang = getUserLanguage(user);
        await ctx.reply(await t(lang, "user_blocked"));
        return; // Keyingi middleware'larga o'tmaslik
      }
    }
    await next();
  } catch (error) {
    logger.error("Middleware error", error);
  }
});

// Majburiy kanal middleware - faqat start dan keyin
bot.use(async (ctx, next) => {
  // /start yoki admin bo'lsa, o'tkazish
  if (
    ctx.message?.text === "/start" ||
    (ctx.updateType === "callback_query" &&
      ctx.callbackQuery.data === "check_subscription")
  ) {
    return next();
  }

  if (ctx.from && !isAdmin(ctx.from.id)) {
    return checkChannelMembership(ctx, next);
  }

  return next();
});

// ========== COMMANDS ==========

/**
 * Start command - Til faqat bir marta so'raladi
 */
bot.command("start", async (ctx) => {
  try {
    await ctx.scene.leave();

    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    // Agar foydalanuvchi tili tanlanmagan bo'lsa
    if (!user.language) {
      await ctx.reply(t("uz", "welcome"), {
        ...getLanguageKeyboard(),
      });
      return;
    }

    // Majburiy kanalga obuna tekshirish
    const channelEnabled = await Settings.getSetting(
      "required_channel_enabled",
      false
    );
    const requiredChannel = await Settings.getSetting("required_channel", null);
    if (channelEnabled && requiredChannel && !user.hasJoinedChannel) {
      const channelInfo = await Settings.getSetting("channel_info", {
        username: requiredChannel.replace("@", ""),
        title: "Bizning kanal",
      });

      const message = await t(lang, "must_join_channel", {
        channel: channelInfo.title,
      });

      await ctx.reply(message, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: await t(lang, "join_channel"),
                url: `https://t.me/${channelInfo.username}`,
              },
            ],
            [
              {
                text: await t(lang, "check_subscription"),
                callback_data: "check_subscription",
              },
            ],
          ],
        },
      });
      return;
    }

    // Agar telefon raqam kiritilmagan bo'lsa (kanal obunasidan keyin)
    if (!user.phoneNumber && user.hasJoinedChannel) {
      await ctx.reply(
        await t(lang, "request_phone"),
        await getPhoneRequestKeyboard(lang)
      );
      return;
    }

    // Asosiy menyuni ko'rsatish
    await ctx.reply(
      await t(lang, "main_menu"),
      await getMainMenuKeyboard(lang)
    );
  } catch (error) {
    logger.error("Start command error", error);
  }
});

/**
 * Admin command
 */
bot.command("admin", async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    const lang = getUserLanguage(ctx.session.user);
    return ctx.reply(t(lang, "admin_not_authorized"));
  }

  const keyboard = Markup.keyboard([
    ["📊 Statistika", "📝 Tabriklar"],
    ["📢 E'lon yuborish", "⚙️ Sozlamalar"],
    ["◀️ Orqaga"],
  ]).resize();

  await ctx.reply("👨‍💼 Admin panel", keyboard);
});

// ========== LANGUAGE SELECTION ==========

bot.action("lang_uz", async (ctx) => {
  try {
    await ctx.answerCbQuery("✅ Til o'zgartirildi");
    await updateUserLanguage(ctx.from.id, "uz");
    ctx.session.user.language = "uz";

    await ctx.editMessageText(`✅ ${await t("uz", "language_set")}`);
    await ctx.reply(
      await t("uz", "main_menu"),
      await getMainMenuKeyboard("uz")
    );
  } catch (error) {
    logger.error("Language change error", error);
  }
});

bot.action("lang_cr", async (ctx) => {
  try {
    await ctx.answerCbQuery("✅ Тил ўзгартирилди");
    await updateUserLanguage(ctx.from.id, "cr");
    ctx.session.user.language = "cr";

    await ctx.editMessageText(`✅ ${await t("cr", "language_set")}`);
    await ctx.reply(
      await t("cr", "main_menu"),
      await getMainMenuKeyboard("cr")
    );
  } catch (error) {
    logger.error("Language change error", error);
  }
});

bot.action("lang_ru", async (ctx) => {
  try {
    await ctx.answerCbQuery("✅ Язык изменен");
    await updateUserLanguage(ctx.from.id, "ru");
    ctx.session.user.language = "ru";

    await ctx.editMessageText(`✅ ${await t("ru", "language_set")}`);
    await ctx.reply(
      await t("ru", "main_menu"),
      await getMainMenuKeyboard("ru")
    );
  } catch (error) {
    logger.error("Language change error", error);
  }
});

// ========== CHANNEL MEMBERSHIP ==========

bot.action("check_subscription", handleCheckSubscription);

// ========== MAIN MENU HANDLERS ==========

/**
 * Send greeting
 */
bot.hears(/💌/, async (ctx) => {
  await ctx.scene.enter("greeting");
});

/**
 * Countdown to Ramadan
 */
bot.hears(/⏰/, async (ctx) => {
  try {
    const lang = getUserLanguage(ctx.session.user);
    const dbRamadanDate = await Settings.getSetting(
      "ramadan_start_date",
      ramadanDate
    );
    const countdown = calculateTimeToRamadan(dbRamadanDate);
    const currentTime = getCurrentTime();

    const message = t(lang, "ramadan_countdown", {
      days: countdown.days,
      hours: countdown.hours,
      minutes: countdown.minutes,
      seconds: countdown.seconds,
      date: currentTime.date,
      time: currentTime.time,
    });

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(t(lang, "btn_refresh"), "refresh_countdown")],
    ]);

    await ctx.reply(message, keyboard);
  } catch (error) {
    logger.error("Countdown handler error", error);
  }
});

/**
 * Location
 */
bot.hears(/📍/, async (ctx) => {
  await ctx.scene.enter("location");
});

/**
 * Suggestion
 */
bot.hears(/💡/, async (ctx) => {
  await ctx.scene.enter("suggestion");
});

/**
 * Settings
 */
bot.hears(/⚙️/, async (ctx) => {
  await ctx.scene.enter("settings");
});

/**
 * Prayers (Duolar)
 */
bot.hears(/🤲/, async (ctx) => {
  try {
    const lang = getUserLanguage(ctx.session.user);
    const prayers = await Prayer.find({ isActive: true })
      .sort({ order: 1 })
      .maxTimeMS(5000);

    if (prayers.length === 0) {
      await ctx.reply(t(lang, "no_prayers"));
      return;
    }

    const keyboard = Markup.inlineKeyboard([
      ...prayers.map((prayer) => [
        Markup.button.callback(
          prayer.title[lang] || prayer.title.uz,
          `prayer_${prayer._id}`
        ),
      ]),
      [Markup.button.callback(t(lang, "btn_back"), "close_prayers")],
    ]);

    await ctx.reply(t(lang, "prayers_select"), keyboard);
  } catch (error) {
    logger.error("Prayers handler error", error);
  }
});

/**
 * Calendar (Taqvim)
 */
bot.hears(/📅/, async (ctx) => {
  try {
    const lang = getUserLanguage(ctx.session.user);
    await ctx.reply(
      await t(lang, "calendar_title"),
      await getCalendarViewKeyboard(lang)
    );
  } catch (error) {
    logger.error("Calendar handler error", error);
  }
});

/**
 * About
 */
bot.hears(/ℹ️/, async (ctx) => {
  try {
    const lang = getUserLanguage(ctx.session.user);

    // Get custom about text from database, fallback to translation
    const customAboutText = await Settings.getSetting("about_bot_text", null);
    const message =
      customAboutText && customAboutText[lang]
        ? customAboutText[lang]
        : await t(lang, "about_bot", { admin: adminUser });

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.url(
          "📢 Kanal",
          `https://t.me/${process.env.CHANNEL_USER}`
        ),
        Markup.button.url("👨‍💼 Admin", `https://t.me/${adminUser}`),
      ],
    ]);

    await ctx.reply(message, keyboard);
  } catch (error) {
    logger.error("About handler error", error);
  }
});

// ========== INLINE ACTIONS ==========

/**
 * Open settings
 */
bot.action("open_settings", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const lang = getUserLanguage(ctx.session.user);

    const message = `⚙️ ${await t(lang, "btn_settings")}`;

    await ctx.editMessageText(message, await getSettingsInlineKeyboard(lang));
  } catch (error) {
    logger.error("Open settings error", error);
  }
});

/**
 * Change language inline
 */
bot.action("change_lang", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const lang = getUserLanguage(ctx.session.user);
    await ctx.editMessageText(
      t(lang, "choose_language"),
      getLanguageKeyboard(true)
    );
  } catch (error) {
    logger.error("Change lang error", error);
  }
});

/**
 * Change location
 */
bot.action("change_location", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.scene.enter("location");
  } catch (error) {
    logger.error("Change location error", error);
  }
});

/**
 * Back to about
 */
bot.action("back_to_about", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const lang = getUserLanguage(ctx.session.user);

    // Get custom about text from database, fallback to translation
    const customAboutText = await Settings.getSetting("about_bot_text", null);
    const message =
      customAboutText && customAboutText[lang]
        ? customAboutText[lang]
        : await t(lang, "about_bot", { admin: adminUser });

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.url(
          "📢 Kanal",
          `https://t.me/${process.env.CHANNEL_USER}`
        ),
        Markup.button.url("👨‍💼 Admin", `https://t.me/${adminUser}`),
      ],
    ]);

    await ctx.editMessageText(message, keyboard);
  } catch (error) {
    logger.error("Back to about error", error);
  }
});

/**
 * Refresh countdown
 */
bot.action("refresh_countdown", async (ctx) => {
  try {
    await ctx.answerCbQuery("🔄 Yangilanmoqda...");
    const lang = getUserLanguage(ctx.session.user);
    const dbRamadanDate = await Settings.getSetting(
      "ramadan_start_date",
      ramadanDate
    );
    const countdown = calculateTimeToRamadan(dbRamadanDate);
    const currentTime = getCurrentTime();

    const message = t(lang, "ramadan_countdown", {
      days: countdown.days,
      hours: countdown.hours,
      minutes: countdown.minutes,
      seconds: countdown.seconds,
      date: currentTime.date,
      time: currentTime.time,
    });

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(t(lang, "btn_refresh"), "refresh_countdown")],
    ]);

    await ctx.editMessageText(message, keyboard);
  } catch (error) {
    logger.error("Refresh countdown error", error);
  }
});

/**
 * Prayers action handlers
 */
/**
 * Prayer content display
 */
bot.action(/prayer_(.+)/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const prayerId = ctx.match[1];
    const lang = getUserLanguage(ctx.session.user);

    const prayer = await Prayer.findById(prayerId).maxTimeMS(5000);

    if (!prayer) {
      await ctx.answerCbQuery(t(lang, "prayer_not_found"), {
        show_alert: true,
      });
      return;
    }

    const content = prayer.content[lang] || prayer.content.uz;

    await ctx.editMessageText(content, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: await t(lang, "btn_back"),
              callback_data: "back_to_prayers_list",
            },
          ],
        ],
      },
    });
  } catch (error) {
    logger.error("Prayer action error", error);
  }
});

/**
 * Old prayers action handlers (deprecated - for backward compatibility)
 */
bot.action(/prayers_(uz|cr|ru)/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const prayerLang = ctx.match[1];
    const userLang = getUserLanguage(ctx.session.user);

    // Get prayers text from database or use default
    const customPrayers = await Settings.getSetting("prayers_text", null);
    let prayersText;

    if (customPrayers && customPrayers[prayerLang]) {
      prayersText = customPrayers[prayerLang];
    } else {
      prayersText = t(prayerLang, "prayers_text");
    }

    await ctx.editMessageText(prayersText, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: await t(userLang, "btn_back"),
              callback_data: "back_to_prayers_list",
            },
          ],
        ],
      },
    });
  } catch (error) {
    logger.error("Prayers action error", error);
  }
});

/**
 * Back to prayers list
 */
bot.action("back_to_prayers_list", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const lang = getUserLanguage(ctx.session.user);
    const prayers = await Prayer.find({ isActive: true })
      .sort({ order: 1 })
      .maxTimeMS(5000);

    if (prayers.length === 0) {
      await ctx.editMessageText(t(lang, "no_prayers"));
      return;
    }

    const keyboard = Markup.inlineKeyboard([
      ...prayers.map((prayer) => [
        Markup.button.callback(
          prayer.title[lang] || prayer.title.uz,
          `prayer_${prayer._id}`
        ),
      ]),
      [Markup.button.callback(t(lang, "btn_back"), "close_prayers")],
    ]);

    await ctx.editMessageText(t(lang, "prayers_select"), keyboard);
  } catch (error) {
    logger.error("Error in back_to_prayers_list:", error);
  }
});

/**
 * Close prayers menu
 */
bot.action("close_prayers", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.deleteMessage();
  } catch (error) {
    logger.error("Error in close_prayers:", error);
  }
});

/**
 * Back to settings menu from language selection
 */
bot.action("back_to_settings", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.scene.enter("settings");
  } catch (error) {
    logger.error("Error in back_to_settings:", error);
    // Fallback - show main menu
    try {
      const lang = getUserLanguage(ctx.session.user);
      await ctx.editMessageText(t(lang, "main_menu"));
    } catch (e) {
      logger.error("Failed to show main menu:", e);
    }
  }
});

/**
 * Calendar daily view
 */
bot.action("calendar_daily", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const lang = getUserLanguage(ctx.session.user);
    const user = ctx.session.user;

    const latitude = user.location?.latitude || 41.2995;
    const longitude = user.location?.longitude || 69.2401;
    const locationName = user.location?.name || "Tashkent";

    // Foydalanuvchi sozlamalarini olish
    const method = user.prayerSettings?.calculationMethod || 1;
    const school = user.prayerSettings?.school || 1;
    const midnightMode = user.prayerSettings?.midnightMode || 0;
    const latitudeAdjustment = user.prayerSettings?.latitudeAdjustment || 1;

    const prayerData = await getPrayerTimes(
      latitude,
      longitude,
      method,
      school,
      midnightMode,
      latitudeAdjustment
    );

    if (!prayerData.success) {
      return ctx.reply(t(lang, "error_try_again"));
    }

    const nextPrayer = getNextPrayer(prayerData.timings);

    let message =
      t(lang, "calendar_daily_title") +
      `\n📍 ${locationName}\n📅 ${prayerData.date}\n📿 ${prayerData.hijri}\n\n`;
    message += t(lang, "prayer_fajr", { time: prayerData.timings.fajr }) + "\n";
    message +=
      t(lang, "prayer_sunrise", { time: prayerData.timings.sunrise }) + "\n";
    message +=
      t(lang, "prayer_dhuhr", { time: prayerData.timings.dhuhr }) + "\n";
    message += t(lang, "prayer_asr", { time: prayerData.timings.asr }) + "\n";
    message +=
      t(lang, "prayer_maghrib", { time: prayerData.timings.maghrib }) + "\n";
    message += t(lang, "prayer_isha", { time: prayerData.timings.isha });

    if (nextPrayer) {
      message += t(lang, "prayer_next", {
        prayer: nextPrayer.name,
        time: nextPrayer.time,
        remaining: nextPrayer.remaining,
      });
    }

    await ctx.editMessageText(message, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: t(lang, "btn_back"),
              callback_data: "back_to_calendar_view",
            },
          ],
        ],
      },
    });
  } catch (error) {
    logger.error("Error in calendar_daily:", error);
  }
});

/**
 * Calendar weekly view
 */
bot.action("calendar_weekly", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const lang = getUserLanguage(ctx.session.user);
    const user = ctx.session.user;

    const latitude = user.location?.latitude || 41.2995;
    const longitude = user.location?.longitude || 69.2401;
    const locationName = user.location?.name || "Tashkent";

    // Foydalanuvchi sozlamalarini olish
    const method = user.prayerSettings?.calculationMethod || 1;
    const school = user.prayerSettings?.school || 1;
    const midnightMode = user.prayerSettings?.midnightMode || 0;
    const latitudeAdjustment = user.prayerSettings?.latitudeAdjustment || 1;

    const moment = require("moment-timezone");
    let message = t(lang, "calendar_weekly_title") + `\n📍 ${locationName}\n\n`;

    // Week day names
    const weekDays = {
      uz: [
        "yakshanba",
        "dushanba",
        "seshanba",
        "chorshanba",
        "payshanba",
        "juma",
        "shanba",
      ],
      cr: [
        "якшанба",
        "душанба",
        "сешанба",
        "чоршанба",
        "пайшанба",
        "жума",
        "шанба",
      ],
      ru: [
        "воскресенье",
        "понедельник",
        "вторник",
        "среда",
        "четверг",
        "пятница",
        "суббота",
      ],
    };

    // Get prayer times for next 7 days
    for (let i = 0; i < 7; i++) {
      const date = moment.tz("Asia/Tashkent").add(i, "days");
      const prayerData = await getPrayerTimes(
        latitude,
        longitude,
        method,
        school,
        midnightMode,
        latitudeAdjustment
      );

      if (prayerData.success) {
        const dayOfWeek = date.day();
        const dayName =
          weekDays[lang]?.[dayOfWeek] || weekDays["uz"][dayOfWeek];
        message += `📅 ${date.format("DD.MM.YYYY")} (${dayName})\n`;
        message += `🌅 ${prayerData.timings.fajr} | ☀️ ${prayerData.timings.dhuhr} | 🌤 ${prayerData.timings.asr}\n`;
        message += `🌇 ${prayerData.timings.maghrib} | 🌙 ${prayerData.timings.isha}\n\n`;
      }
    }

    await ctx.editMessageText(message, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: t(lang, "btn_back"),
              callback_data: "back_to_calendar_view",
            },
          ],
        ],
      },
    });
  } catch (error) {
    logger.error("Error in calendar_weekly:", error);
  }
});

/**
 * Show qibla direction
 */
bot.action("show_qibla", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const lang = getUserLanguage(ctx.session.user);
    const user = ctx.session.user;

    const latitude = user.location?.latitude;
    const longitude = user.location?.longitude;
    const locationName = user.location?.name || "Tashkent";

    if (!latitude || !longitude) {
      return ctx.reply(await t(lang, "error_no_location"), {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: await t(lang, "btn_set_location"),
                callback_data: "open_location_settings",
              },
            ],
            [
              {
                text: await t(lang, "btn_back"),
                callback_data: "back_to_calendar_view",
              },
            ],
          ],
        },
      });
    }

    const qibla = getQiblaDirection(latitude, longitude);

    let message = `🧭 ${await t(lang, "qibla_title")}\n\n`;
    message += `📍 ${locationName}\n`;
    message += `📐 ${await t(lang, "qibla_bearing")}: ${qibla.bearing}°\n`;
    message += `➡️ ${await t(lang, "qibla_direction")}: ${qibla.direction}\n`;
    message += `📏 ${await t(
      lang,
      "qibla_distance"
    )}: ${qibla.distance.toLocaleString()} км\n\n`;
    message += `🕋 ${await t(lang, "qibla_kaaba")}: ${qibla.kaaba.latitude}°N, ${
      qibla.kaaba.longitude
    }°E\n`;
    message += `\n${await t(lang, "qibla_instruction")}`;

    await ctx.editMessageText(message, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: await t(lang, "btn_back"),
              callback_data: "back_to_calendar_view",
            },
          ],
        ],
      },
    });
  } catch (error) {
    logger.error("Error in show_qibla:", error);
  }
});

/**
 * Open location settings (replaces old open_settings)
 */
bot.action("open_location_settings", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const lang = getUserLanguage(ctx.session.user);
    const user = ctx.session.user;

    const locationName = user.location?.name || "Tashkent";
    const languages = {
      uz: "O'zbekcha (Lotin)",
      cr: "Ўзбекча (Кирилл)",
      ru: "Русский",
    };

    const message = `📍 Joylashuv sozlamalari\n\n🌐 Til: ${languages[lang]}\n📍 Joylashuv: ${locationName}`;

    await ctx.editMessageText(message, await getLocationSettingsKeyboard(lang));
  } catch (error) {
    logger.error("Error in open_location_settings:", error);
  }
});

/**
 * Open reminder settings
 */
bot.action("open_reminder_settings", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const lang = getUserLanguage(ctx.session.user);
    const user = ctx.session.user;

    const reminderSettings = user.reminderSettings || {
      enabled: true,
      minutesBefore: 15,
    };
    const message =
      t(lang, "reminder_settings") +
      `\n\n${reminderSettings.enabled ? "✅" : "❌"} ${
        reminderSettings.enabled
          ? t(lang, "reminder_enabled")
          : t(lang, "reminder_disabled")
      }\n⏰ ${reminderSettings.minutesBefore} daqiqa oldin`;

    await ctx.editMessageText(
      message,
      getReminderSettingsKeyboard(lang, reminderSettings)
    );
  } catch (error) {
    logger.error("Error in open_reminder_settings:", error);
  }
});

/**
 * Toggle reminders on/off
 */
bot.action("toggle_reminders", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    const currentEnabled = user.reminderSettings?.enabled !== false;
    const newSettings = {
      enabled: !currentEnabled,
      minutesBefore: user.reminderSettings?.minutesBefore || 15,
      notifyAtPrayerTime: user.reminderSettings?.notifyAtPrayerTime !== false,
    };

    await updateUserReminders(bot, user.userId, newSettings);
    ctx.session.user.reminderSettings = newSettings;

    const message =
      t(lang, "reminder_settings") +
      `\n\n${newSettings.enabled ? "✅" : "❌"} ${
        newSettings.enabled
          ? t(lang, "reminder_enabled")
          : t(lang, "reminder_disabled")
      }\n⏰ ${newSettings.minutesBefore} daqiqa oldin`;

    await ctx.editMessageText(
      message,
      getReminderSettingsKeyboard(lang, newSettings)
    );
  } catch (error) {
    logger.error("Error in toggle_reminders:", error);
  }
});

/**
 * Set reminder time (5, 10, 15, 30 minutes)
 */
bot.action(/reminder_time_(\d+)/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const minutes = parseInt(ctx.match[1]);
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    const newSettings = {
      enabled: user.reminderSettings?.enabled !== false,
      minutesBefore: minutes,
      notifyAtPrayerTime: user.reminderSettings?.notifyAtPrayerTime !== false,
    };

    await updateUserReminders(bot, user.userId, newSettings);
    ctx.session.user.reminderSettings = newSettings;

    await ctx.answerCbQuery(t(lang, "reminder_updated"));

    const message =
      t(lang, "reminder_settings") +
      `\n\n${newSettings.enabled ? "✅" : "❌"} ${
        newSettings.enabled
          ? t(lang, "reminder_enabled")
          : t(lang, "reminder_disabled")
      }\n⏰ ${newSettings.minutesBefore} daqiqa oldin`;

    await ctx.editMessageText(
      message,
      getReminderSettingsKeyboard(lang, newSettings)
    );
  } catch (error) {
    logger.error("Error in reminder_time:", error);
  }
});

/**
 * Back to calendar view menu
 */
bot.action("back_to_calendar_view", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const lang = getUserLanguage(ctx.session.user);
    await ctx.editMessageText(
      await t(lang, "calendar_title"),
      await getCalendarViewKeyboard(lang)
    );
  } catch (error) {
    logger.error("Error in back_to_calendar_view:", error);
  }
});

/**
 * Back to main menu from inline (just close the message)
 */
bot.action("back_main", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.deleteMessage();
  } catch (error) {
    logger.error("Error in back_main:", error);
  }
});

/**
 * Handle phone number contact
 */
bot.on("contact", async (ctx) => {
  try {
    const phoneNumber = ctx.message.contact.phone_number;
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    // Save phone number
    await User.findOneAndUpdate(
      { userId: user.userId },
      { phoneNumber },
      { new: true }
    );

    ctx.session.user.phoneNumber = phoneNumber;

    await ctx.reply(
      await t(lang, "phone_saved"),
      await getMainMenuKeyboard(lang)
    );
  } catch (error) {
    logger.error("Error saving phone number:", error);
  }
});

// ========== ADMIN HANDLERS ==========

bot.hears("📊 Statistika", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ is_block: false });
    const blockedUsers = await User.countDocuments({ is_block: true });
    const uzUsers = await User.countDocuments({ language: "uz" });
    const crUsers = await User.countDocuments({ language: "cr" });
    const ruUsers = await User.countDocuments({ language: "ru" });

    const message = `📊 Bot statistikasi:\n\n👥 Jami foydalanuvchilar: ${totalUsers}\n✅ Faol: ${activeUsers}\n❌ Bloklangan: ${blockedUsers}\n\n🌐 Tillar bo'yicha:\n🇺🇿 O'zbekcha: ${uzUsers}\n🇷🇺 Кирилл: ${crUsers}\n🇷🇺 Русский: ${ruUsers}`;

    await ctx.reply(message);
  } catch (error) {
    logger.error("Error in stats handler:", error);
  }
});

// ========== ERROR HANDLER ==========

bot.catch(async (err, ctx) => {
  logger.error(`Error for ${ctx.updateType}:`, err);

  // Log to Telegram group
  await logError(err, ctx, `Bot Error - ${ctx.updateType}`);

  try {
    const user = ctx.session?.user;
    const lang = getUserLanguage(user);
    ctx.reply(t(lang, "error_try_again"));
  } catch (e) {
    logger.error("Error sending error message:", e);
  }
});

// ========== START BOT ==========

async function startBot() {
  try {
    console.log("🚀 Starting bot...\n");

    // Connect to database
    console.log("📦 Connecting to database...");
    await db();

    // Wait for connection to stabilize
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Initialize default settings
    console.log("⚙️ Initializing settings...");
    const defaultSettings = [
      {
        key: "required_channel",
        value: null,
        description: "Majburiy kanal (null = yo'q)",
      },
      {
        key: "required_channel_enabled",
        value: false,
        description: "Majburiy kanal faolligi (true/false)",
      },
      {
        key: "channel_info",
        value: { username: "", title: "" },
        description: "Kanal ma'lumotlari",
      },
      {
        key: "greeting_channel",
        value: null,
        description: "Tabrik yuboriladi kanal",
      },
      {
        key: "log_channel",
        value: null,
        description: "Log kanali (error va event loglar)",
      },
      {
        key: "channel_join_delay",
        value: { days: 0, hours: 0 },
        description: "Kanal a'zoligini tekshirish kechikishi (kun va soat)",
      },
      {
        key: "cache_settings",
        value: { ttl: 86400, maxSize: 1000, autoClean: true },
        description: "Cache sozlamalari (TTL, max size, auto clean)",
      },
      {
        key: "about_bot_text",
        value: null,
        description: "Bot haqida matn (uz, cr, ru)",
      },
      {
        key: "ramadan_start_date",
        value: process.env.RAMADAN_DATE || "2026-02-17",
        description: "Ramazon boshlanish sanasi",
      },
    ];

    for (const setting of defaultSettings) {
      const exists = await Settings.findOne({ key: setting.key });
      if (!exists) {
        await Settings.create(setting);
      }
    }

    // Create superadmin if not exists
    const superadmin = await User.findOne({ userId: parseInt(adminId) });
    if (superadmin) {
      superadmin.isAdmin = true;
      superadmin.role = "superadmin";
      await superadmin.save();
      console.log(`✅ Superadmin set: ${adminId}`);
    }

    // Start Admin API FIRST
    console.log("🚀 Starting Admin API...");
    await startAdminAPI();

    // Initialize Message Queue (for bulk messaging)
    console.log("📨 Initializing Message Queue...");
    global.messageQueue = new MessageQueue(bot);
    console.log("✅ Message Queue ready");

    // Initialize prayer reminders for all users
    console.log("🔔 Initializing prayer reminders...");
    await initializeAllReminders(bot);

    // Launch bot AFTER API
    console.log("🤖 Launching bot...");

    // Launch bot in background (non-blocking)
    bot
      .launch({
        dropPendingUpdates: true,
      })
      .then(async () => {
        console.log("\n✅ Bot started successfully!");
        console.log(`📱 Bot username: @${botUser}`);
        console.log(`👨‍💼 Admin ID: ${adminId}`);

        // Initialize error logger
        initErrorLogger(bot);
        console.log("✅ Error logger initialized");

        // Set default menu button for ALL users after bot starts
        console.log("\n🔧 Setting menu button...");
        try {
          const miniAppUrl = process.env.MINI_APP_URL;
          if (miniAppUrl && miniAppUrl.startsWith("https://")) {
            // Set default menu button for all users
            await bot.telegram.setChatMenuButton({
              menu_button: {
                type: "web_app",
                text: "📅 Taqvim",
                web_app: {
                  url: miniAppUrl,
                },
              },
            });
            console.log("✅ Default menu button set: " + miniAppUrl);

            // Also set for admin user specifically
            await bot.telegram.setChatMenuButton({
              chat_id: parseInt(adminId),
              menu_button: {
                type: "web_app",
                text: "📅 Taqvim",
                web_app: {
                  url: miniAppUrl,
                },
              },
            });
            console.log(`✅ Menu button set for admin: ${adminId}`);
          } else {
            console.log("⚠️ MINI_APP_URL not configured or invalid");
          }
        } catch (menuError) {
          console.error("❌ Menu button error:", menuError.message);
          console.error("Full error:", menuError);
          await logError(menuError, null, "Menu Button Setup");
        }
      })
      .catch(async (launchError) => {
        console.error("⚠️ Bot launch error:", launchError.message);
        await logError(launchError, null, "Bot Launch");
      });

    console.log("\n🎉 Backend API va Bot tayyor!\n");
  } catch (error) {
    console.error("\n❌ Error starting bot:", error.message);
    console.error("\n💡 Mumkin sabablari:");
    console.error("   1. MongoDB ishlamayapti");
    console.error("   2. .env fayl noto'g'ri to'ldirilgan");
    console.error("   3. Internet ulanishi yo'q");
    console.error("   4. BOT_TOKEN noto'g'ri\n");

    // Agar faqat bot ishlamasa ham, backend API ni ishga tushir
    console.log("⏭️ Trying to start Admin API anyway...");
    try {
      await startAdminAPI();
      console.log("\n✅ Admin API ishga tushdi!\n");
    } catch (apiError) {
      console.error("❌ Admin API error:", apiError.message);
      process.exit(1);
    }
  }
}

// Start Admin API Server (bot bilan bir xil mongoose connection)
async function startAdminAPI() {
  const express = require("express");
  const cors = require("cors");
  const Admin = require("./models/Admin");
  const bcrypt = require("bcrypt");
  const mongoose = require("mongoose");

  // Ensure database connection
  if (mongoose.connection.readyState !== 1) {
    console.log("⚠️ Database not connected. Reconnecting...");
    try {
      await db();
      console.log("✅ Database reconnected for Admin API");
    } catch (error) {
      console.error("❌ Failed to reconnect database:", error.message);
      throw error;
    }
  } else {
    console.log("✅ Database already connected");
  }

  const app = express();
  const PORT = process.env.PORT || 3001;

  // Create default admin (non-blocking)
  setTimeout(async () => {
    try {
      const adminExists = await Admin.findOne({ username: "admin" }).maxTimeMS(
        5000
      );
      if (!adminExists) {
        const hashedPassword = await bcrypt.hash("admin", 10);
        await Admin.create({
          userId: parseInt(process.env.ADMIN_ID) || 1234567890,
          username: "admin",
          password: hashedPassword,
          firstName: "Admin",
          role: "superadmin",
        });
        console.log("✅ Web admin created: username='admin', password='admin'");
      } else {
        console.log("ℹ️  Web admin already exists");
      }
    } catch (err) {
      console.log("⚠️  Admin creation failed:", err.message);
    }
  }, 2000);

  // CORS - Completely open for all origins with explicit support
  app.use((req, res, next) => {
    // Allow all origins
    const origin = req.headers.origin;
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Methods",
      "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Auth-Token, telegram-data"
    );
    res.header("Access-Control-Expose-Headers", "Content-Length, X-JSON");
    res.header("Access-Control-Max-Age", "86400");

    // Handle preflight
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    next();
  });

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Request logging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });

  // Routes
  const authRoutes = require("./routes/admin/auth");
  const usersRoutes = require("./routes/admin/users");
  const settingsRoutes = require("./routes/admin/settings");
  const greetingsRoutes = require("./routes/admin/greetings");
  const statsRoutes = require("./routes/admin/stats");
  const prayersRoutes = require("./routes/admin/prayers");
  const broadcastRoutes = require("./routes/admin/broadcast");
  const miniappRoutes = require("./routes/admin/miniapp");
  const channelsRoutes = require("./routes/admin/channels");
  const adminsRoutes = require("./routes/admin/admins");
  const prayerDefaultsRoutes = require("./routes/admin/prayerDefaults");
  const locationsRoutes = require("./routes/admin/locations");
  const monthlyPrayerTimesRoutes = require("./routes/admin/monthlyPrayerTimes");
  const cacheRoutes = require("./routes/admin/cache");
  const suggestionsRoutes = require("./routes/admin/suggestions");
  const translationsRoutes = require("./routes/admin/translations");
  const resourcesRoutes = require("./routes/admin/resources");
  const testRoutes = require("./routes/admin/test");
  const backupsRoutes = require("./routes/admin/backups");
  const exportRoutes = require("./routes/admin/export");

  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/greetings", greetingsRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/prayers", prayersRoutes);
  app.use("/api/broadcast", broadcastRoutes);
  app.use("/api/miniapp", miniappRoutes);
  app.use("/api/channels", channelsRoutes);
  app.use("/api/admins", adminsRoutes);
  app.use("/api/prayer-defaults", prayerDefaultsRoutes);
  app.use("/api/locations", locationsRoutes);
  app.use("/api/monthly-prayer-times", monthlyPrayerTimesRoutes);
  app.use("/api/cache", cacheRoutes);
  app.use("/api/suggestions", suggestionsRoutes);
  app.use("/api/translations", translationsRoutes);
  app.use("/api/resources", resourcesRoutes);
  app.use("/api/test", testRoutes);
  app.use("/api/backups", backupsRoutes);
  app.use("/api/export", exportRoutes);

  // Health check
  app.get("/", (req, res) => {
    res.json({
      message: "Ramazon Bot Admin API",
      status: "running",
      port: PORT,
      mongodb:
        require("mongoose").connection.readyState === 1
          ? "connected"
          : "disconnected",
      timestamp: new Date().toISOString(),
    });
  });

  // 404 handler
  app.use((req, res) => {
    res
      .status(404)
      .json({ error: `Route not found: ${req.method} ${req.path}` });
  });

  // Error handler
  app.use((err, req, res, next) => {
    logger.error("❌ API Error:", err.message);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  });

  // Start server
  global.adminApiServer = app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Admin API running on http://localhost:${PORT}`);
  });
}

// Start the bot
startBot();

// Enable graceful stop - after bot starts
process.once("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  try {
    if (bot && typeof bot.stop === "function") {
      await bot.stop("SIGINT");
      console.log("✅ Bot stopped");
    }
  } catch (e) {
    console.log("⚠️ Bot stop warning:", e.message);
  }

  if (global.adminApiServer) {
    global.adminApiServer.close(() => {
      console.log("✅ Admin API stopped");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.once("SIGTERM", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  try {
    if (bot && typeof bot.stop === "function") {
      await bot.stop("SIGTERM");
      console.log("✅ Bot stopped");
    }
  } catch (e) {
    console.log("⚠️ Bot stop warning:", e.message);
  }

  if (global.adminApiServer) {
    global.adminApiServer.close(() => {
      console.log("✅ Admin API stopped");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

module.exports = bot;
