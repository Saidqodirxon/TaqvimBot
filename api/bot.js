const { Telegraf, Scenes, session, Markup } = require("telegraf");
require("dotenv/config");

// Set timezone to Uzbekistan
process.env.TZ = "Asia/Tashkent";

// ==================== GLOBAL ERROR HANDLERS ====================
// Bot hech qachon crash bo'lmasligi uchun
process.on("unhandledRejection", (reason, promise) => {
  console.error("⚠️ Unhandled Rejection at:", promise);
  console.error("Reason:", reason);
  // DO NOT EXIT - Bot must continue working
});

process.on("uncaughtException", (error) => {
  console.error("⚠️ Uncaught Exception:", error);
  console.error("Stack:", error.stack);
  // DO NOT EXIT - Bot must continue working
});

process.on("warning", (warning) => {
  console.warn("⚠️ Node.js Warning:", warning.name);
  console.warn("Message:", warning.message);
  console.warn("Stack:", warning.stack);
});

// ==================== END GLOBAL ERROR HANDLERS ====================

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
const { handleInlineQuery } = require("./utils/inlineMode");
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

// Middleware to load user data - OPTIMIZED
bot.use(async (ctx, next) => {
  try {
    if (ctx.from) {
      const user = await getOrCreateUser(ctx);
      ctx.session.user = user;

      // Update last_active only once per 5 minutes (not every message)
      const now = new Date();
      const lastActive = user.last_active ? new Date(user.last_active) : null;
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      if (!lastActive || lastActive < fiveMinutesAgo) {
        // Fire and forget - don't wait for update
        User.updateOne(
          { userId: ctx.from.id },
          { $set: { last_active: now } }
        ).catch((err) => {
          // Silently ignore last_active update errors
        });
      }

      // Check if user is blocked
      if (user.is_block) {
        const lang = getUserLanguage(user);
        await ctx.reply(await t(lang, "user_blocked"));
        return; // Stop execution
      }

      // Lazy reminder scheduling - schedule reminders on first interaction
      // Only if reminders enabled and not already scheduled
      if (
        user.reminderSettings?.enabled &&
        user.location?.latitude &&
        global.reminderBot &&
        !ctx.session.remindersScheduled
      ) {
        // Schedule in background (non-blocking)
        setImmediate(async () => {
          try {
            await schedulePrayerReminders(global.reminderBot, user);
            ctx.session.remindersScheduled = true;
          } catch (err) {
            // Silently ignore reminder scheduling errors
          }
        });
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
      (ctx.callbackQuery.data === "check_subscription" ||
        ctx.callbackQuery.data === "accept_terms" ||
        ctx.callbackQuery.data.startsWith("lang_")))
  ) {
    return next();
  }

  if (ctx.from && !isAdmin(ctx.from.id)) {
    return checkChannelMembership(ctx, next);
  }

  return next();
});

// Terms and Phone Request middleware - OPTIMIZED with caching
bot.use(async (ctx, next) => {
  // Skip for admin, callbacks, and /start
  if (
    isAdmin(ctx.from?.id) ||
    ctx.updateType === "callback_query" ||
    ctx.message?.text === "/start" ||
    !ctx.session?.user?.language
  ) {
    return next();
  }

  const user = ctx.session.user;
  const lang = getUserLanguage(user);

  // Check terms (only if user hasn't accepted recently)
  if (!user.termsAccepted) {
    const termsEnabled = await Settings.getSetting("terms_enabled", false);
    const termsUrl = await Settings.getSetting("terms_url", "");

    if (termsEnabled && termsUrl) {
      const termsMessage = await t(lang, "terms_message");
      await ctx.reply(termsMessage, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: await t(lang, "btn_read_terms"),
                url: termsUrl,
              },
            ],
            [
              {
                text: await t(lang, "btn_accept_terms"),
                callback_data: "accept_terms",
              },
            ],
          ],
        },
      });
      return;
    }
  }

  // Check phone request (only if user hasn't provided phone)
  if (!user.phoneNumber) {
    const phoneEnabled = await Settings.getSetting(
      "phone_request_enabled",
      false
    );

    if (phoneEnabled) {
      const phoneRecheckDays = await Settings.getSetting(
        "phone_recheck_days",
        180
      );
      const shouldAskPhone =
        !user.phoneRequestedAt ||
        (user.phoneRequestedAt &&
          (Date.now() - new Date(user.phoneRequestedAt).getTime()) /
            (1000 * 60 * 60 * 24) >
            phoneRecheckDays);

      if (shouldAskPhone) {
        await ctx.reply(
          await t(lang, "request_phone"),
          await getPhoneRequestKeyboard(lang)
        );
        // Fire and forget - don't wait for update
        User.findOneAndUpdate(
          { userId: ctx.from.id },
          { phoneRequestedAt: new Date() },
          { select: "userId phoneRequestedAt" }
        ).catch(() => {});
        ctx.session.user.phoneRequestedAt = new Date();
        return;
      }
    }
  }

  return next();
});

// ========== COMMANDS ==========

/**
 * Inline query handler - allows sharing prayer times in any chat
 */
bot.on("inline_query", handleInlineQuery);

/**
 * Start command - OPTIMIZED for speed (< 200ms response)
 */
bot.command("start", async (ctx) => {
  try {
    await ctx.scene.leave();

    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    // Set personalized menu button for this user
    try {
      const miniAppUrl = process.env.MINI_APP_URL;
      if (miniAppUrl) {
        await ctx.telegram.callApi('setChatMenuButton', {
          chat_id: ctx.from.id,
          menu_button: {
            type: "web_app",
            text: "📅 Taqvim",
            web_app: {
              url: `${miniAppUrl}?userId=${ctx.from.id}`,
            },
          },
        });
      }
    } catch (menuErr) {
      // Silently fail, don't block start command
    }

    // 1. Language selection (if not set)
    if (!user.language) {
      const welcomeText = await t("uz", "welcome");
      await ctx.reply(welcomeText, {
        ...getLanguageKeyboard(),
      });
      return;
    }

    // 2. Location check (CRITICAL - bot can't work without location)
    if (!user.location || !user.location.latitude || !user.location.longitude) {
      await ctx.reply(
        await t(lang, "no_location_set"),
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              await t(lang, "btn_set_location"),
              "enter_location_scene"
            ),
          ],
        ])
      );
      return;
    }

    // 3. Send main menu IMMEDIATELY (user gets instant response)
    const [mainMenuText, mainMenuKeyboard] = await Promise.all([
      t(lang, "main_menu"),
      getMainMenuKeyboard(lang),
    ]);

    await ctx.reply(mainMenuText, mainMenuKeyboard);

    // 4. Background checks (non-blocking, user already sees menu)
    // Channel membership check - runs in background after menu is sent
    setImmediate(async () => {
      try {
        const [channelEnabled, requiredChannel] = await Promise.all([
          Settings.getSetting("required_channel_enabled", false),
          Settings.getSetting("required_channel", null),
        ]);

        if (channelEnabled && requiredChannel && !user.hasJoinedChannel) {
          const isMember = await checkChannelMembership(ctx, () => {}, true);
          if (!isMember) {
            const channelInfo = await Settings.getSetting("channel_info", {
              username: requiredChannel.replace("@", ""),
              title: "Bizning kanal",
            });

            const [message, joinBtnText, checkBtnText] = await Promise.all([
              t(lang, "must_join_channel", { channel: channelInfo.title }),
              t(lang, "join_channel"),
              t(lang, "check_subscription"),
            ]);

            await ctx.telegram.sendMessage(ctx.from.id, message, {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: joinBtnText,
                      url: `https://t.me/${channelInfo.username}`,
                    },
                  ],
                  [
                    {
                      text: checkBtnText,
                      callback_data: "check_subscription",
                    },
                  ],
                ],
              },
            });
          }
        }
      } catch (err) {
        // Silently ignore background check errors
        logger.error("Background channel check error", err);
      }
    });
  } catch (error) {
    logger.error("Start command error", error);
    // Send error message to user
    try {
      await ctx.reply("⚠️ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    } catch (e) {
      // Ignore if can't send error message
    }
  }
});

/**
 * Admin command
 */
bot.command("admin", async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    const lang = getUserLanguage(ctx.session.user);
    return ctx.reply(await t(lang, "admin_not_authorized"));
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

    const languageSet = await t("uz", "language_set");
    await ctx.editMessageText(`✅ ${languageSet}`);

    // Check if terms are enabled and show terms
    const termsEnabled = await Settings.getSetting("terms_enabled", false);
    const termsUrl = await Settings.getSetting("terms_url", "");

    if (termsEnabled && termsUrl && !ctx.session.user.termsAccepted) {
      const termsMessage = await t("uz", "terms_message");
      await ctx.reply(termsMessage, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: await t("uz", "btn_read_terms"),
                url: termsUrl,
              },
            ],
            [
              {
                text: await t("uz", "btn_accept_terms"),
                callback_data: "accept_terms",
              },
            ],
          ],
        },
      });
      return;
    }

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

    const languageSet = await t("cr", "language_set");
    await ctx.editMessageText(`✅ ${languageSet}`);

    // Check if terms are enabled and show terms
    const termsEnabled = await Settings.getSetting("terms_enabled", false);
    const termsUrl = await Settings.getSetting("terms_url", "");

    if (termsEnabled && termsUrl && !ctx.session.user.termsAccepted) {
      const termsMessage = await t("cr", "terms_message");
      await ctx.reply(termsMessage, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: await t("cr", "btn_read_terms"),
                url: termsUrl,
              },
            ],
            [
              {
                text: await t("cr", "btn_accept_terms"),
                callback_data: "accept_terms",
              },
            ],
          ],
        },
      });
      return;
    }

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

    const languageSet = await t("ru", "language_set");
    await ctx.editMessageText(`✅ ${languageSet}`);

    // Check if terms are enabled and show terms
    const termsEnabled = await Settings.getSetting("terms_enabled", false);
    const termsUrl = await Settings.getSetting("terms_url", "");

    if (termsEnabled && termsUrl && !ctx.session.user.termsAccepted) {
      const termsMessage = await t("ru", "terms_message");
      await ctx.reply(termsMessage, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: await t("ru", "btn_read_terms"),
                url: termsUrl,
              },
            ],
            [
              {
                text: await t("ru", "btn_accept_terms"),
                callback_data: "accept_terms",
              },
            ],
          ],
        },
      });
      return;
    }

    await ctx.reply(
      await t("ru", "main_menu"),
      await getMainMenuKeyboard("ru")
    );
  } catch (error) {
    logger.error("Language change error", error);
  }
});

// ========== TERMS ACCEPTANCE ==========

bot.action("accept_terms", async (ctx) => {
  try {
    await ctx.answerCbQuery("✅");
    const lang = getUserLanguage(ctx.session.user);

    // Update user terms acceptance
    await User.findOneAndUpdate(
      { userId: ctx.from.id },
      {
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        phoneRequestedAt: new Date(), // Track when phone can be requested
      }
    );
    ctx.session.user.termsAccepted = true;
    ctx.session.user.termsAcceptedAt = new Date();
    ctx.session.user.phoneRequestedAt = new Date();

    await ctx.editMessageText(await t(lang, "terms_accepted"));
    await ctx.reply(
      await t(lang, "main_menu"),
      await getMainMenuKeyboard(lang)
    );
  } catch (error) {
    logger.error("Accept terms error", error);
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

    const message = await t(lang, "ramadan_countdown", {
      days: countdown.days,
      hours: countdown.hours,
      minutes: countdown.minutes,
      seconds: countdown.seconds,
      date: currentTime.date,
      time: currentTime.time,
    });

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          await t(lang, "btn_refresh"),
          "refresh_countdown"
        ),
      ],
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
      await ctx.reply(await t(lang, "no_prayers"));
      return;
    }

    const keyboard = Markup.inlineKeyboard([
      ...prayers.map((prayer) => [
        Markup.button.callback(
          prayer.title[lang] || prayer.title.uz,
          `prayer_${prayer._id}`
        ),
      ]),
      [Markup.button.callback(await t(lang, "btn_back"), "close_prayers")],
    ]);

    await ctx.reply(await t(lang, "prayers_select"), keyboard);
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
      await t(lang, "choose_language"),
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
 * Enter location scene (alias for change_location)
 */
bot.action("enter_location_scene", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.scene.enter("location");
  } catch (error) {
    logger.error("Enter location scene error", error);
  }
});

/**
 * Restart bot - redirect to /start
 */
bot.action("restart_bot", async (ctx) => {
  try {
    await ctx.answerCbQuery("🔄 Bot qayta ishga tushirilmoqda...");
    await ctx.scene.leave();

    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    // Redirect to main menu
    await ctx.reply(
      await t(lang, "main_menu"),
      await getMainMenuKeyboard(lang)
    );
  } catch (error) {
    logger.error("Restart bot error", error);
  }
});

/**
 * Enable reminders from broadcast
 */
bot.action("enable_reminders_from_broadcast", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    // Check if user has location
    if (!user.location || !user.location.latitude) {
      await ctx.reply(
        await t(lang, "no_location_set"),
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              await t(lang, "btn_set_location"),
              "enter_location_scene"
            ),
          ],
        ])
      );
      return;
    }

    // Enable reminders
    await User.updateOne(
      { userId: user.userId },
      {
        $set: {
          "reminderSettings.enabled": true,
          "reminderSettings.defaultMinutes": 10,
          "reminderSettings.notifyAtPrayerTime": true,
        },
      }
    );

    // Update session
    ctx.session.user.reminderSettings = {
      enabled: true,
      defaultMinutes: 10,
      notifyAtPrayerTime: true,
    };

    await ctx.reply(
      "✅ " + (await t(lang, "reminders_enabled_success")),
      await getMainMenuKeyboard(lang)
    );
  } catch (error) {
    logger.error("Enable reminders from broadcast error", error);
  }
});

/**
 * Enable reminders from prayer times view
 */
bot.action("enable_reminders_from_prayer", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    // Check if user has location
    if (!user.location || !user.location.latitude) {
      await ctx.editMessageText(
        await t(lang, "no_location_set"),
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              await t(lang, "btn_set_location"),
              "enter_location_scene"
            ),
          ],
        ])
      );
      return;
    }

    // Enable reminders
    await User.updateOne(
      { userId: user.userId },
      {
        $set: {
          "reminderSettings.enabled": true,
          "reminderSettings.defaultMinutes": 10,
          "reminderSettings.notifyAtPrayerTime": true,
        },
      }
    );

    // Update session
    ctx.session.user.reminderSettings = {
      enabled: true,
      defaultMinutes: 10,
      notifyAtPrayerTime: true,
    };

    // Show reminder settings
    await ctx.editMessageText(
      "✅ " + (await t(lang, "reminders_enabled_success")),
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: await t(lang, "btn_reminder_settings"),
                callback_data: "open_reminder_settings",
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
      }
    );
  } catch (error) {
    logger.error("Enable reminders from prayer error", error);
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

    const message = await t(lang, "ramadan_countdown", {
      days: countdown.days,
      hours: countdown.hours,
      minutes: countdown.minutes,
      seconds: countdown.seconds,
      date: currentTime.date,
      time: currentTime.time,
    });

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          await t(lang, "btn_refresh"),
          "refresh_countdown"
        ),
      ],
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
      await ctx.answerCbQuery(await t(lang, "prayer_not_found"), {
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
      await ctx.editMessageText(await t(lang, "no_prayers"));
      return;
    }

    const keyboard = Markup.inlineKeyboard([
      ...prayers.map((prayer) => [
        Markup.button.callback(
          prayer.title[lang] || prayer.title.uz,
          `prayer_${prayer._id}`
        ),
      ]),
      [Markup.button.callback(await t(lang, "btn_back"), "close_prayers")],
    ]);

    await ctx.editMessageText(await t(lang, "prayers_select"), keyboard);
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
      await ctx.editMessageText(await t(lang, "main_menu"));
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

    // ❗ LOCATION MAJBURIY - default Tashkent yo'q
    if (!user.location || !user.location.latitude || !user.location.longitude) {
      await ctx.editMessageText(
        await t(lang, "no_location_set"),
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              await t(lang, "btn_set_location"),
              "enter_location_scene"
            ),
          ],
        ])
      );
      return;
    }

    const latitude = user.location.latitude;
    const longitude = user.location.longitude;
    const locationName = user.location.name || "Joylashuv";

    // Foydalanuvchi sozlamalarini olish
    const method = user.prayerSettings?.calculationMethod || 1;
    const school = user.prayerSettings?.school || 1;
    const midnightMode = user.prayerSettings?.midnightMode || 0;
    const latitudeAdjustment = user.prayerSettings?.latitudeAdjustment || 1;

    let prayerData;
    try {
      prayerData = await getPrayerTimes(
        latitude,
        longitude,
        method,
        school,
        midnightMode,
        latitudeAdjustment
      );
    } catch (prayerError) {
      console.error("Prayer times fetch error:", prayerError.message);
      return ctx.reply(await t(lang, "error_try_again"));
    }

    if (!prayerData.success) {
      return ctx.reply(await t(lang, "error_try_again"));
    }

    const nextPrayer = getNextPrayer(prayerData.timings);

    let message =
      (await t(lang, "calendar_daily_title")) +
      `\n📍 ${locationName}\n📅 ${prayerData.date}\n📿 ${prayerData.hijri}\n\n`;
    message +=
      (await t(lang, "prayer_fajr", { time: prayerData.timings.fajr })) + "\n";
    message +=
      (await t(lang, "prayer_sunrise", { time: prayerData.timings.sunrise })) +
      "\n";
    message +=
      (await t(lang, "prayer_dhuhr", { time: prayerData.timings.dhuhr })) +
      "\n";
    message +=
      (await t(lang, "prayer_asr", { time: prayerData.timings.asr })) + "\n";
    message +=
      (await t(lang, "prayer_maghrib", { time: prayerData.timings.maghrib })) +
      "\n";
    message += await t(lang, "prayer_isha", { time: prayerData.timings.isha });

    if (nextPrayer) {
      message += await t(lang, "prayer_next", {
        prayer: nextPrayer.name,
        time: nextPrayer.time,
        remaining: nextPrayer.remaining,
      });
    }

    // Check if user has reminders enabled
    const hasReminders = user.reminderSettings?.enabled ?? false;
    const keyboard = [
      [
        {
          text: "📅 Web taqvim",
          web_app: { url: `${miniAppUrl}?userId=${ctx.from.id}` },
        },
      ],
      [
        {
          text: await t(lang, "btn_back"),
          callback_data: "back_to_calendar_view",
        },
      ],
    ];

    // Add reminder button if not enabled
    if (!hasReminders) {
      keyboard.unshift([
        {
          text: "🔔 " + (await t(lang, "btn_enable_reminders")),
          callback_data: "enable_reminders_from_prayer",
        },
      ]);
    }

    await ctx.editMessageText(message, {
      reply_markup: {
        inline_keyboard: keyboard,
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

    // ❗ LOCATION MAJBURIY
    if (!user.location || !user.location.latitude || !user.location.longitude) {
      await ctx.editMessageText(
        await t(lang, "no_location_set"),
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              await t(lang, "btn_set_location"),
              "enter_location_scene"
            ),
          ],
        ])
      );
      return;
    }

    const latitude = user.location.latitude;
    const longitude = user.location.longitude;
    const locationName = user.location.name || "Joylashuv";

    // Foydalanuvchi sozlamalarini olish
    const method = user.prayerSettings?.calculationMethod || 1;
    const school = user.prayerSettings?.school || 1;
    const midnightMode = user.prayerSettings?.midnightMode || 0;
    const latitudeAdjustment = user.prayerSettings?.latitudeAdjustment || 1;

    const moment = require("moment-timezone");
    let message =
      (await t(lang, "calendar_weekly_title")) + `\n📍 ${locationName}\n\n`;

    // Week day names with emojis
    const weekDays = {
      uz: [
        "Yakshanba",
        "Dushanba",
        "Seshanba",
        "Chorshanba",
        "Payshanba",
        "Juma",
        "Shanba",
      ],
      cr: [
        "Якшанба",
        "Душанба",
        "Сешанба",
        "Чоршанба",
        "Пайшанба",
        "Жума",
        "Шанба",
      ],
      ru: [
        "Воскресенье",
        "Понедельник",
        "Вторник",
        "Среда",
        "Четверг",
        "Пятница",
        "Суббота",
      ],
    };

    // Get prayer times for next 7 days
    for (let i = 0; i < 7; i++) {
      const date = moment.tz("Asia/Tashkent").add(i, "days");
      try {
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
          const dayEmoji = i === 0 ? "📍" : dayOfWeek === 5 ? "🕌" : "📅";
          message += `${dayEmoji} <b>${date.format("DD.MM")} - ${dayName}</b>\n`;
          message += `🌅 Bomdod: ${prayerData.timings.fajr}  |  ☀️ Peshin: ${prayerData.timings.dhuhr}\n`;
          message += `🌤 Asr: ${prayerData.timings.asr}  |  🌆 Shom: ${prayerData.timings.maghrib}\n`;
          message += `🌙 Xufton: ${prayerData.timings.isha}\n\n`;
        }
      } catch (dayError) {
        console.error(
          `Error getting prayer times for day ${i}:`,
          dayError.message
        );
        // Skip this day but continue with others
      }
    }

    // Check if user has reminders enabled
    const hasRemindersWeekly = user.reminderSettings?.enabled ?? false;
    const keyboardWeekly = [
      [
        {
          text: await t(lang, "btn_back"),
          callback_data: "back_to_calendar_view",
        },
      ],
    ];

    // Add reminder button if not enabled
    if (!hasRemindersWeekly) {
      keyboardWeekly.unshift([
        {
          text: "🔔 " + (await t(lang, "btn_enable_reminders")),
          callback_data: "enable_reminders_from_prayer",
        },
      ]);
    }

    await ctx.editMessageText(message, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: keyboardWeekly,
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
      (await t(lang, "reminder_settings")) +
      `\n\n${reminderSettings.enabled ? "✅" : "❌"} ${
        reminderSettings.enabled
          ? await t(lang, "reminder_enabled")
          : await t(lang, "reminder_disabled")
      }\n⏰ ${reminderSettings.minutesBefore} daqiqa oldin`;

    await ctx.editMessageText(
      message,
      await getReminderSettingsKeyboard(lang, reminderSettings)
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
      (await t(lang, "reminder_settings")) +
      `\n\n${newSettings.enabled ? "✅" : "❌"} ${
        newSettings.enabled
          ? await t(lang, "reminder_enabled")
          : await t(lang, "reminder_disabled")
      }\n⏰ ${newSettings.minutesBefore} daqiqa oldin`;

    await ctx.editMessageText(
      message,
      await getReminderSettingsKeyboard(lang, newSettings)
    );
  } catch (error) {
    console.error("Error toggling reminders:", error);
  }
});

/**
 * Disable all reminders
 */
bot.action("disable_all_reminders", async (ctx) => {
  try {
    await ctx.answerCbQuery("⏳ O'chirilmoqda...");
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    // Disable all reminders
    const newSettings = {
      enabled: false,
      minutesBefore: 15,
      notifyAtPrayerTime: false,
    };

    await updateUserReminders(bot, user.userId, newSettings);
    ctx.session.user.reminderSettings = newSettings;

    await ctx.editMessageText(
      "✅ Barcha eslatmalar o'chirildi\n\n" +
      "Eslatmalarni qayta yoqish uchun sozlamalar bo'limiga o'ting.",
      Markup.inlineKeyboard([
        [Markup.button.callback("◀️ Orqaga", "back_to_settings")]
      ])
    );
  } catch (error) {
    console.error("Error disabling all reminders:", error);
    await ctx.answerCbQuery("❌ Xatolik yuz berdi");
  }
});

    await ctx.editMessageText(
      message,
      await getReminderSettingsKeyboard(lang, newSettings)
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

    await ctx.answerCbQuery(await t(lang, "reminder_updated"));

    const message =
      (await t(lang, "reminder_settings")) +
      `\n\n${newSettings.enabled ? "✅" : "❌"} ${
        newSettings.enabled
          ? await t(lang, "reminder_enabled")
          : await t(lang, "reminder_disabled")
      }\n⏰ ${newSettings.minutesBefore} daqiqa oldin`;

    await ctx.editMessageText(
      message,
      await getReminderSettingsKeyboard(lang, newSettings)
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
 * Approve greeting from admin
 */
bot.action(/approve_(.+)/, async (ctx) => {
  try {
    await ctx.answerCbQuery("✅ Tabrik tasdiqlandi!");

    const greetingId = ctx.match[1];
    const GreetingLog = require("./models/GreetingLog");
    const Settings = require("./models/Settings");

    // Find greeting
    const greeting = await GreetingLog.findById(greetingId);
    if (!greeting) {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      await ctx.reply("❌ Tabrik topilmadi yoki allaqachon o'chirilgan");
      return;
    }

    // Check if already processed
    if (greeting.status !== "pending") {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      await ctx.reply(
        `ℹ️ Bu tabrik allaqachon ${greeting.status === "approved" ? "tasdiqlangan" : "rad etilgan"}`
      );
      return;
    }

    // Remove inline buttons FIRST
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});

    // Update status
    greeting.status = "approved";
    greeting.reviewedBy = ctx.from.id;
    greeting.reviewedAt = new Date();
    await greeting.save();

    // Get greeting channel
    const greetingChannelSetting = await Settings.findOne({
      key: "greeting_channel",
    });
    const greetingChannel = greetingChannelSetting?.value;

    // Get greeting text - handle both text and message fields
    const greetingText = greeting.text || greeting.message || "(Matn yo'q)";

    // Send to channel if configured
    if (greetingChannel) {
      try {
        const channelMsg = await ctx.telegram.sendMessage(
          greetingChannel,
          greetingText,
          { parse_mode: "HTML" }
        );

        greeting.sentToChannel = true;
        greeting.channelMessageId = channelMsg.message_id;
        await greeting.save();

        await ctx.reply(
          `✅ Tabrik tasdiqlandi va kanalga yuborildi!\n👤 ${greeting.firstName} (@${greeting.username || "no_username"})\n\n${greetingText.substring(0, 100)}...`
        );
      } catch (channelError) {
        console.error("Error sending to channel:", channelError);
        await ctx.reply(
          `✅ Tabrik tasdiqlandi, lekin kanalga yuborishda xatolik:\n${channelError.message}`
        );
      }
    } else {
      await ctx.reply(
        `✅ Tabrik tasdiqlandi!\n⚠️ Kanal sozlanmagan, kanalga yuborilmadi.\n👤 ${greeting.firstName} (@${greeting.username || "no_username"})\n\n${greetingText.substring(0, 100)}...`
      );
    }

    // Send notification to user
    try {
      await ctx.telegram.sendMessage(
        greeting.userId,
        "✅ Sizning tabrigingiz tasdiqlandi va kanalga joylandi!\n\nRahmat 🙏"
      );
    } catch (userError) {
      console.error("Error notifying user:", userError.message);
    }
  } catch (error) {
    console.error("Error approving greeting:", error);
    await ctx.reply("❌ Xatolik yuz berdi: " + error.message).catch(() => {});
  }
});

/**
 * Reject greeting from admin
 */
bot.action(/reject_(.+)/, async (ctx) => {
  try {
    await ctx.answerCbQuery("❌ Tabrik rad etildi");

    const greetingId = ctx.match[1];
    const GreetingLog = require("./models/GreetingLog");

    // Find greeting
    const greeting = await GreetingLog.findById(greetingId);
    if (!greeting) {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      await ctx.reply("❌ Tabrik topilmadi yoki allaqachon o'chirilgan");
      return;
    }

    // Check if already processed
    if (greeting.status !== "pending") {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      await ctx.reply(
        `ℹ️ Bu tabrik allaqachon ${greeting.status === "approved" ? "tasdiqlangan" : "rad etilgan"}`
      );
      return;
    }

    // Remove inline buttons FIRST
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});

    // Update status
    greeting.status = "rejected";
    greeting.reviewedBy = ctx.from.id;
    greeting.reviewedAt = new Date();
    greeting.rejectionReason = "Admin tomonidan rad etildi";
    await greeting.save();

    await ctx.reply(
      `❌ Tabrik rad etildi\n👤 ${greeting.firstName} (@${greeting.username || "no_username"})`
    );

    // Send notification to user
    try {
      await ctx.telegram.sendMessage(
        greeting.userId,
        "❌ Afsuski, sizning tabrigingiz moderatsiyadan o'tmadi.\n\nQoidalarga rioya qilgan holda qayta yuboring."
      );
    } catch (userError) {
      console.error("Error notifying user:", userError.message);
    }
  } catch (error) {
    console.error("Error rejecting greeting:", error);
    await ctx.reply("❌ Xatolik yuz berdi: " + error.message).catch(() => {});
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
    ctx.reply(await t(lang, "error_try_again"));
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
    const superadmin = await User.findOne({ userId: parseInt(adminId) }).select(
      "userId isAdmin role"
    );
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

    // Initialize prayer reminder system (lazy loading, non-blocking)
    console.log("🔔 Initializing prayer reminder system...");
    initializeAllReminders(bot).catch((err) => {
      console.error("Reminder init error:", err.message);
    });

    // ==================== BOT ERROR HANDLER ====================
    // Bot ichidagi barcha xatolarni tutish
    bot.catch((err, ctx) => {
      console.error("⚠️ Bot error caught:", err);
      console.error("Error in update:", ctx.update);

      // Try to send error message to user if possible
      if (ctx && ctx.from) {
        const lang = getUserLanguage(ctx.session?.user);
        ctx.reply(t(lang, "error_try_again")).catch(() => {
          // Ignore if can't send error message
          console.error("⚠️ Could not send error message to user");
        });
      }

      // Log error but DO NOT crash bot
      logError(err, ctx, "Bot Update Error").catch(() => {
        // Ignore if logging fails
      });
    });
    // ==================== END BOT ERROR HANDLER ====================

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
            // Set default menu button with userId parameter
            // When user opens, we'll set their specific userId
            await bot.telegram.callApi('setChatMenuButton', {
              menu_button: {
                type: "web_app",
                text: "📅 Taqvim",
                web_app: {
                  url: miniAppUrl, // Base URL, will add userId when user opens
                },
              },
            });
            console.log("✅ Default menu button set: " + miniAppUrl);
          } else {
            console.log("⚠️ MINI_APP_URL not configured or invalid");
          }
        } catch (menuError) {
          console.error("❌ Menu button error:", menuError.message);
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
  const botInfoRoutes = require("./routes/admin/bot-info");

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
  app.use("/api/bot-info", botInfoRoutes);

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
