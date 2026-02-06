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
  setRedisCache,
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
const RedisCache = require("./utils/redis");

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
        // Update last_active and initialize delayStartedAt if needed
        const updateData = { $set: { last_active: now } };

        // Start delay timer if not already started
        if (!user.delayStartedAt) {
          updateData.$set.delayStartedAt = now;
          ctx.session.user.delayStartedAt = now;
        }

        User.updateOne({ userId: ctx.from.id }, updateData).catch((err) => {
          // Silently ignore update errors
        });

        // Notify if user returned after 24h
        if (lastActive) {
          const hoursInactive =
            (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);

          if (hoursInactive >= 24) {
            // Get threshold from settings or default to 150 days
            const thresholdDays = await Settings.getSetting(
              "returning_user_threshold_days",
              150
            );

            if (hoursInactive >= thresholdDays * 24) {
              // VETERAN RESET - User returned after a long time (new season)
              const resetData = {
                $set: {
                  delayStartedAt: now,
                  termsAccepted: false,
                  hasJoinedChannel: false,
                  phoneNumber: null,
                  phoneRequestedAt: null,
                },
              };

              await User.updateOne({ userId: ctx.from.id }, resetData).catch(
                () => {}
              );

              // Update session
              ctx.session.user.delayStartedAt = now;
              ctx.session.user.termsAccepted = false;
              ctx.session.user.hasJoinedChannel = false;
              ctx.session.user.phoneNumber = null;
              ctx.session.user.phoneRequestedAt = null;

              logger.logVeteranReset(user, Math.floor(hoursInactive / 24));
            } else {
              // Regular return after 24h
              logger.logReturningUser(user);
            }
          }
        }
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
        global.reminderBot
      ) {
        const { isUserScheduled } = require("./utils/prayerReminders");

        // Check if reminders already scheduled for this user
        if (!isUserScheduled(user.userId)) {
          // Schedule in background (non-blocking)
          setImmediate(async () => {
            try {
              await schedulePrayerReminders(global.reminderBot, user);
            } catch (err) {
              // Silently ignore reminder scheduling errors
            }
          });
        }
      }
    }
    await next();
  } catch (error) {
    logger.error("Middleware error", error);
  }
});

// Majburiy kanal middleware - LAZY (keyinroq so'raladi)
bot.use(async (ctx, next) => {
  // Skip channel check for:
  // 1. /start command (check runs in background)
  // 2. Admin users
  // 3. Inline queries
  // 4. Callback queries for language/terms/subscription
  // 5. Mini app data requests
  // 6. Reminder toggle from notifications
  if (
    ctx.message?.text === "/start" ||
    isAdmin(ctx.from?.id) ||
    ctx.updateType === "inline_query" ||
    ctx.updateType === "chosen_inline_result" ||
    (ctx.updateType === "callback_query" &&
      (ctx.callbackQuery.data === "check_subscription" ||
        ctx.callbackQuery.data === "accept_terms" ||
        ctx.callbackQuery.data.startsWith("lang_") ||
        ctx.callbackQuery.data === "today_times" ||
        ctx.callbackQuery.data === "tomorrow_times" ||
        ctx.callbackQuery.data === "disable_all_reminders" ||
        ctx.callbackQuery.data === "enable_reminders"))
  ) {
    return next();
  }

  // Check channel membership only if enabled and user hasn't joined
  const user = ctx.session?.user;
  if (user && !user.hasJoinedChannel) {
    return checkChannelMembership(ctx, next);
  }

  return next();
});

// Terms and Phone Request middleware - ULTRA LAZY (minimal blocking)
bot.use(async (ctx, next) => {
  // Skip for:
  // 1. Admin users
  // 2. All callback queries
  // 3. Inline queries
  // 4. /start command
  // 5. Users without language set
  // 6. Bot commands (they handle their own flows)
  if (
    isAdmin(ctx.from?.id) ||
    ctx.updateType === "callback_query" ||
    ctx.updateType === "inline_query" ||
    ctx.updateType === "chosen_inline_result" ||
    ctx.message?.text?.startsWith("/") ||
    !ctx.session?.user?.language
  ) {
    return next();
  }

  const user = ctx.session.user;
  const lang = getUserLanguage(user);

  // Check if user is within grace period (delayStartedAt)
  // We use startTime for all relative delays
  const now = Date.now();
  const startTime = user.delayStartedAt
    ? new Date(user.delayStartedAt).getTime()
    : now;

  // Get ALL relevant delays from settings
  const [termsDelayHours, phoneDelayHours] = await Promise.all([
    Settings.getSetting("terms_delay_hours", 6),
    Settings.getSetting("phone_delay_hours", 12),
  ]);

  const timePassed = now - startTime;

  // 1. TERMS CHECK - Independent delay
  if (
    user.termsAccepted !== true &&
    ctx.message?.text &&
    !ctx.message.text.startsWith("/")
  ) {
    const termsEnabled = await Settings.getSetting("terms_enabled", false);

    if (termsEnabled) {
      // Use specific hours for terms delay (convert to Number to avoid string issues)
      if (timePassed < Number(termsDelayHours) * 60 * 60 * 1000) {
        return next(); // Still in terms grace period
      }

      const termsUrl = await Settings.getSetting("terms_url", "");
      if (termsUrl) {
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
  }

  if (
    !user.phoneNumber &&
    ctx.message?.text &&
    !ctx.message.text.startsWith("/")
  ) {
    const phoneEnabled = await Settings.getSetting(
      "phone_request_enabled",
      false
    );

    if (phoneEnabled) {
      // Check if enough time has passed for phone request
      if (timePassed < Number(phoneDelayHours) * 60 * 60 * 1000) {
        return next(); // Ask later
      }

      const phoneRecheckDays = await Settings.getSetting(
        "phone_recheck_days",
        180
      );
      const shouldAskPhone =
        !user.phoneRequestedAt ||
        (Date.now() - new Date(user.phoneRequestedAt).getTime()) /
          (1000 * 60 * 60 * 24) >
          phoneRecheckDays;

      if (shouldAskPhone) {
        await ctx.reply(
          await t(lang, "request_phone"),
          await getPhoneRequestKeyboard(lang)
        );
        // Fire and forget
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

    const now = new Date();
    // Reset delay period on /start
    await User.updateOne(
      { userId: ctx.from.id },
      { $set: { delayStartedAt: now } }
    ).catch(() => {});

    if (ctx.session.user) {
      ctx.session.user.delayStartedAt = now;
    }

    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    // Set personalized menu button for this user
    try {
      const miniAppUrl = process.env.MINI_APP_URL;
      if (miniAppUrl) {
        await ctx.telegram.callApi("setChatMenuButton", {
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
      await ctx.reply(
        "⚠️ Xatolik yuz berdi. Iltimos, /start buyrug'ini qayta yuboring."
      );
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
    ["📢 E'lon yuborish", "⚙️ Sozlamlar"],
    ["◀️ Orqaga"],
  ]).resize();

  await ctx.reply("👨‍💼 Admin panel", keyboard);
});

// Admins stats commands
bot.command("stat", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [total, blocked, today, active24h] = await Promise.all([
      User.estimatedDocumentCount(),
      User.countDocuments({ is_block: true }),
      User.countDocuments({ createdAt: { $gte: startOfDay } }),
      User.countDocuments({
        last_active: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
    ]);

    const message =
      `📊 <b>Bot Statistikasi</b>\n\n` +
      `👥 Jami foydalanuvchilar: <b>${formatNumber(total)}</b>\n` +
      `🚫 Bloklanganlar: <b>${formatNumber(blocked)}</b>\n` +
      `🆕 Bugun qo'shilganlar: <b>${formatNumber(today)}</b>\n` +
      `⚡️ 24 soat ichida faol: <b>${formatNumber(active24h)}</b>\n` +
      `📅 Server vaqti: ${new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}`;

    await ctx.reply(message, { parse_mode: "HTML" });
  } catch (error) {
    logger.error("Stat command error:", error);
    ctx.reply("❌ Statistika olishda xatolik");
  }
});

// ========== LANGUAGE SELECTION ==========

bot.action("lang_uz", async (ctx) => {
  try {
    await ctx.answerCbQuery("✅ Til o'zgartirildi");
    await updateUserLanguage(ctx.from.id, "uz");
    ctx.session.user.language = "uz";

    const languageSet = await t("uz", "language_set");
    await ctx.editMessageText(`✅ ${languageSet}`);

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
 * Today times - show today's prayer times - FULLY FIXED
 */
bot.action("today_times", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    console.log("📅 Today times requested by user:", user.userId);

    // Check if user has location
    if (!user.location || !user.location.latitude) {
      console.log("❌ User has no location");
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

    const latitude = user.location.latitude;
    const longitude = user.location.longitude;
    const locationName = user.location.name || "Joylashuv";

    console.log(`📍 Location: ${locationName} (${latitude}, ${longitude})`);

    // Get prayer times with timeout
    const method = user.prayerSettings?.calculationMethod || 3;
    const school = user.prayerSettings?.school || 1;

    console.log(`⚙️ Settings: method=${method}, school=${school}`);

    let prayerData;
    try {
      // Add timeout wrapper
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Prayer times fetch timeout")), 15000)
      );

      prayerData = await Promise.race([
        getPrayerTimes(latitude, longitude, method, school),
        timeoutPromise,
      ]);
    } catch (fetchError) {
      console.error("❌ Prayer times fetch error:", fetchError);
      await ctx.reply(
        "❌ Namoz vaqtlarini yuklashda xatolik yuz berdi. Iltimos, bir necha daqiqadan keyin qayta urinib ko'ring.\\n\\n" +
          "Agar muammo davom etsa, /start bosing."
      );
      return;
    }

    console.log("📊 Prayer data received:", {
      success: prayerData?.success,
      hasTimings: !!prayerData?.timings,
      source: prayerData?.source,
    });

    if (!prayerData || !prayerData.success) {
      console.error("❌ Prayer data failed:", prayerData);
      await ctx.reply(
        "❌ Namoz vaqtlarini olishda xatolik. Iltimos, keyinroq qayta urinib ko'ring."
      );
      return;
    }

    // Check if timings exist
    if (!prayerData.timings) {
      console.error("❌ Timings is undefined in prayerData:", prayerData);
      await ctx.reply(
        "❌ Namoz vaqtlari ma'lumoti topilmadi.\\n\\n" +
          "Iltimos, joylashuvingizni qayta tanlang: /start → ⚙️ Sozlamalar → 📍 Joylashuv"
      );
      return;
    }

    const timings = prayerData.timings;

    // Log timings structure
    console.log("⏰ Timings structure:", Object.keys(timings));
    console.log("⏰ Timings values:", timings);

    // Validate that required prayer times exist
    if (
      !timings.fajr ||
      !timings.dhuhr ||
      !timings.asr ||
      !timings.maghrib ||
      !timings.isha
    ) {
      console.error("❌ Missing required prayer times:", timings);
      await ctx.reply(
        "❌ Namoz vaqtlari to'liq emas. Administrator bilan bog'laning.\\n\\n" +
          `Debug info: ${JSON.stringify(timings)}`
      );
      return;
    }

    const today = new Date().toLocaleDateString("uz-UZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const message =
      `🕌 <b>Bugungi namoz vaqtlari</b>\n` +
      `📅 ${today}\n` +
      `📍 ${locationName}\n\n` +
      `🌅 Bomdod: ${timings.fajr}\n` +
      `☀️ Quyosh: ${timings.sunrise || timings.Sunrise || "N/A"}\n` +
      `🌞 Peshin: ${timings.dhuhr}\n` +
      `🌤 Asr: ${timings.asr}\n` +
      `🌆 Shom: ${timings.maghrib}\n` +
      `🌙 Xufton: ${timings.isha}`;

    await ctx.reply(message, { parse_mode: "HTML" });
  } catch (error) {
    console.error("❌ Today times critical error:", error);
    logger.error("Today times error", error);
    try {
      await ctx.reply(
        "❌ Xatolik yuz berdi. Iltimos, /start bosing va qayta urinib ko'ring."
      );
    } catch (replyError) {
      console.error("❌ Failed to send error message:", replyError);
    }
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
    const miniAppUrl =
      process.env.MINI_APP_URL || "https://ramazon-taqvim.netlify.app";

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
    const method = user.prayerSettings?.calculationMethod || 3; // Default MWL
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
      await ctx.editMessageText(
        "❌ Namoz vaqtlarini yuklashda xatolik yuz berdi.\n\nIltimos, qayta urinib ko'ring.",
        Markup.inlineKeyboard([
          [Markup.button.callback("🔄 Qayta urinish", "calendar_daily")],
          [Markup.button.callback("◀️ Orqaga", "back_to_calendar_view")],
        ])
      );
      return;
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
    if (
      error.description &&
      error.description.includes("message is not modified")
    ) {
      // Ignore this error
      return;
    }
    logger.error(`Error in calendar_weekly (User: ${ctx.from?.id}):`, error);
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

    // Get user from DB directly (notification callback might not have session)
    const userId = ctx.from?.id;
    if (!userId) {
      console.error("disable_all_reminders: No user ID");
      return;
    }

    // Load user from database
    const user = await User.findOne({ userId });
    if (!user) {
      console.error("disable_all_reminders: User not found:", userId);
      await ctx.answerCbQuery("❌ Foydalanuvchi topilmadi");
      return;
    }

    const lang = getUserLanguage(user);

    // Disable all reminders
    const newSettings = {
      enabled: false,
      minutesBefore: user.reminderSettings?.minutesBefore || 15,
      notifyAtPrayerTime: false,
    };

    await updateUserReminders(bot, userId, newSettings);

    // Update session if exists
    if (ctx.session?.user) {
      ctx.session.user.reminderSettings = newSettings;
    }

    // Try to edit message, fallback to reply
    try {
      await ctx.editMessageText(
        "✅ Barcha eslatmalar o'chirildi\n\n" +
          "📌 Namoz vaqtlari haqida eslatmalar endi yuborilmaydi.\n\n" +
          "Agar kerak bo'lsa, sozlamalar orqali qayta yoqishingiz mumkin.",
        Markup.inlineKeyboard([
          [Markup.button.callback("🔔 Qayta yoqish", "enable_reminders")],
        ])
      );
    } catch (editError) {
      // Message might be too old to edit, send new one
      await ctx.reply(
        "✅ Barcha eslatmalar o'chirildi\n\n" +
          "📌 Namoz vaqtlari haqida eslatmalar endi yuborilmaydi.\n\n" +
          "Agar kerak bo'lsa, sozlamalar orqali qayta yoqishingiz mumkin."
      );
    }

    console.log(`✅ Reminders disabled for user ${userId}`);
  } catch (error) {
    console.error("Error disabling all reminders:", error);
    try {
      await ctx.answerCbQuery("❌ Xatolik yuz berdi");
    } catch (e) {}
  }
});

/**
 * Enable reminders (from notification button)
 */
bot.action("enable_reminders", async (ctx) => {
  try {
    await ctx.answerCbQuery("⏳ Yoqilmoqda...");

    const userId = ctx.from?.id;
    if (!userId) return;

    // Load user from database
    const user = await User.findOne({ userId });
    if (!user) {
      await ctx.answerCbQuery("❌ Foydalanuvchi topilmadi");
      return;
    }

    const lang = getUserLanguage(user);

    // Check if user has location
    if (!user.location || !user.location.latitude) {
      try {
        await ctx.editMessageText(
          "📍 Eslatmalarni yoqish uchun avval lokatsiyangizni kiriting.",
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "📍 Lokatsiya kiritish",
                "enter_location_scene"
              ),
            ],
          ])
        );
      } catch (e) {
        await ctx.reply(
          "📍 Eslatmalarni yoqish uchun avval lokatsiyangizni kiriting."
        );
      }
      return;
    }

    // Enable reminders
    const newSettings = {
      enabled: true,
      minutesBefore: user.reminderSettings?.minutesBefore || 15,
      notifyAtPrayerTime: false,
    };

    await updateUserReminders(bot, userId, newSettings);

    // Update session if exists
    if (ctx.session?.user) {
      ctx.session.user.reminderSettings = newSettings;
    }

    try {
      await ctx.editMessageText(
        "✅ Eslatmalar qayta yoqildi\n\n" +
          `📌 Namoz vaqtidan ${newSettings.minutesBefore} daqiqa oldin eslatma yuboriladi.`,
        Markup.inlineKeyboard([
          [Markup.button.callback("🔕 O'chirish", "disable_all_reminders")],
        ])
      );
    } catch (e) {
      await ctx.reply(
        "✅ Eslatmalar qayta yoqildi\n\n" +
          `📌 Namoz vaqtidan ${newSettings.minutesBefore} daqiqa oldin eslatma yuboriladi.`
      );
    }

    console.log(`✅ Reminders enabled for user ${userId}`);
  } catch (error) {
    console.error("Error enabling reminders:", error);
    try {
      await ctx.answerCbQuery("❌ Xatolik yuz berdi");
    } catch (e) {}
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
 * Menu command - easily get back to the main menu
 */
bot.command("menu", async (ctx) => {
  const lang = getUserLanguage(ctx.session.user);
  await ctx.reply(await t(lang, "main_menu"), await getMainMenuKeyboard(lang));
});

/**
 * Handle show_main_menu action from reminders
 */
bot.action("show_main_menu", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const lang = getUserLanguage(ctx.session.user);
    await ctx.reply(
      await t(lang, "main_menu"),
      await getMainMenuKeyboard(lang)
    );
  } catch (error) {
    logger.error("Error in show_main_menu:", error);
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
    const Greeting = require("./models/Greeting");
    const Settings = require("./models/Settings");

    // Find greeting
    const greeting = await Greeting.findById(greetingId);
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
    await greeting.save();

    // Get greeting channel
    const greetingChannelSetting = await Settings.findOne({
      key: "greeting_channel",
    });
    const greetingChannel =
      greetingChannelSetting?.value || process.env.GREETING_CHANNEL_ID;

    // Get greeting text - handle both text and message fields
    const greetingText = greeting.message || greeting.caption || "(Matn yo'q)";

    // Send to channel if configured
    if (greetingChannel) {
      try {
        // Format message with bot promotion as requested
        // Format: {Name} dan yangi tabrik \n\n {text} \n\n @RamazonCalendarBot orqali siz ham tabrik yo'llang
        const botPromotion = `\n\n@${process.env.BOT_USER || "RamazonCalendarBot"} orqali siz ham tabrik yo'llang`;
        const senderName = greeting.firstName || "Foydalanuvchi";
        const channelHeader = `${senderName} dan yangi tabrik\n\n`;

        let channelMsg;
        let messageLink = "";

        if (greeting.messageType === "photo" && greeting.fileId) {
          // Send photo with caption
          const photoCaption = `${channelHeader}${greetingText}${botPromotion}`;
          channelMsg = await ctx.telegram.sendPhoto(
            greetingChannel,
            greeting.fileId,
            { caption: photoCaption, parse_mode: "HTML" }
          );
        } else if (greeting.messageType === "video" && greeting.fileId) {
          // Send video with caption
          const videoCaption = `${channelHeader}${greetingText}${botPromotion}`;
          channelMsg = await ctx.telegram.sendVideo(
            greetingChannel,
            greeting.fileId,
            { caption: videoCaption, parse_mode: "HTML" }
          );
        } else {
          // Send text message
          const formattedMessage = `${channelHeader}${greetingText}${botPromotion}`;
          channelMsg = await ctx.telegram.sendMessage(
            greetingChannel,
            formattedMessage,
            { parse_mode: "HTML" }
          );
        }

        // Construct message link
        if (channelMsg) {
          try {
            const chat = await ctx.telegram.getChat(greetingChannel);
            if (chat.username) {
              messageLink = `https://t.me/${chat.username}/${channelMsg.message_id}`;
            } else {
              // For private channels, use the c/ID format if possible
              const chatIdStr = greetingChannel.toString().replace("-100", "");
              messageLink = `https://t.me/c/${chatIdStr}/${channelMsg.message_id}`;
            }
          } catch (e) {
            console.error("Error getting chat info for link:", e);
          }
        }

        await ctx.reply(
          `✅ Tabrik tasdiqlandi va kanalga yuborildi!\n👤 ${greeting.firstName} (@${greeting.username || "no_username"})\n\n${greetingText.substring(0, 100)}...${messageLink ? `\n\n🔗 Havola: ${messageLink}` : ""}`
        );

        // Send notification to user with link
        try {
          const userNotification = messageLink
            ? `✅ Sizning tabrigingiz tasdiqlandi va kanalga joylandi!\n\n🔗 Tabrikingizni ko'rish: ${messageLink}\n\nRahmat 🙏`
            : "✅ Sizning tabrigingiz tasdiqlandi va kanalga joylandi!\n\nRahmat 🙏";

          await ctx.telegram.sendMessage(greeting.userId, userNotification);
        } catch (userError) {
          console.error("Error notifying user:", userError.message);
        }
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

      // Send basic notification to user if channel not set
      try {
        await ctx.telegram.sendMessage(
          greeting.userId,
          "✅ Sizning tabrigingiz tasdiqlandi!\n\nRahmat 🙏"
        );
      } catch (userError) {
        console.error("Error notifying user:", userError.message);
      }
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
    const Greeting = require("./models/Greeting");

    // Find greeting
    const greeting = await Greeting.findById(greetingId);
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

    // Initialize default settings quietly
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
      {
        key: "terms_enabled",
        value: false,
        description: "Foydalanish shartlari faolligi (true/false)",
      },
      {
        key: "terms_url",
        value: "",
        description: "Foydalanish shartlari havola (link)",
      },
      {
        key: "terms_delay_hours",
        value: 6,
        description: "Foydalanish shartlarini so'rash kechikishi (soat)",
      },
      {
        key: "phone_request_enabled",
        value: false,
        description: "Telefon raqam so'rash faolligi (true/false)",
      },
      {
        key: "phone_delay_hours",
        value: 12,
        description: "Telefon raqamni so'rash kechikishi (soat)",
      },
      {
        key: "returning_user_threshold_days",
        value: 150,
        description:
          "Eski userni yangilash chegarasi (kun). Shu vaqtdan ko'p kirilmagan bo'lsa, kechikish va shartlar tiklanadi.",
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

    // Start Admin API
    await startAdminAPI();

    // Initialize Message Queue
    global.messageQueue = new MessageQueue(bot);

    // Initialize prayer reminder system (lazy loading, non-blocking)
    console.log("🔔 Initializing prayer reminder system...");
    initializeAllReminders(bot).catch((err) => {
      console.error("Reminder init error:", err.message);
    });

    // Initialize Redis cache
    const redisCache = new RedisCache();
    redisCache
      .initialize()
      .then(() => {
        setRedisCache(redisCache);
      })
      .catch((err) => {
        // Silent fail for Redis
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
      logger.logError(err, "Bot Update Error").catch(() => {
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
        console.log(`✅ Bot @${botUser} started. Admin ID: ${adminId}`);

        // Set default menu button for ALL users after bot starts
        try {
          const miniAppUrl = process.env.MINI_APP_URL;
          if (miniAppUrl && miniAppUrl.startsWith("https://")) {
            await bot.telegram.callApi("setChatMenuButton", {
              menu_button: {
                type: "web_app",
                text: "📅 Taqvim",
                web_app: {
                  url: miniAppUrl,
                },
              },
            });
          }
        } catch (menuError) {
          logger.error("Menu button setup error", menuError);
        }
      })
      .catch(async (launchError) => {
        console.error("⚠️ Bot launch error:", launchError.message);
        logger.logError(launchError, "Bot Launch");
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

  // Make bot instance available to routes
  app.set("bot", bot);

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
          isActive: true,
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
