// ============================================================
// ADD TO api/bot.js - INTEGRATION CODE
// ============================================================

// ========== 1. IMPORTS (Add to top of file) ==========

const redisCache = require("./utils/redis");
const { handleInlineQuery } = require("./utils/inlineMode");
const locationSceneV2 = require("./scenes/location-v2");

// ========== 2. REDIS INITIALIZATION (Add in main function, BEFORE bot.launch) ==========

// Initialize Redis cache system
console.log("🔄 Initializing Redis cache...");
try {
  const redisEnabled = await redisCache.initialize();
  if (redisEnabled) {
    console.log("✅ Redis cache connected and ready");
  } else {
    console.log("ℹ️  Redis caching disabled");
  }
} catch (error) {
  console.error("⚠️  Redis initialization failed:", error.message);
  console.log("ℹ️  Continuing without Redis cache");
}

// ========== 3. REGISTER NEW LOCATION SCENE (Replace old location scene registration) ==========

// REPLACE this line:
// stage.register(locationScene);

// WITH this:
stage.register(locationSceneV2); // New advanced location scene

// ========== 4. INLINE QUERY HANDLER (Add BEFORE bot.launch()) ==========

// Inline mode: Share prayer times in any chat
// Usage: @RamazonCalendarBot bugun/ertaga/ramazon
bot.on("inline_query", async (ctx) => {
  try {
    await handleInlineQuery(ctx);
  } catch (error) {
    console.error("Inline query handler error:", error);
  }
});

console.log("✅ Inline mode enabled: @RamazonCalendarBot bugun/ertaga/ramazon");

// ========== 5. LOCATION CHECK MIDDLEWARE (Add BEFORE bot.use(stage.middleware())) ==========

// Check if user has location for prayer-related actions
bot.use(async (ctx, next) => {
  try {
    // Skip if no session
    if (!ctx.session || !ctx.session.user) {
      return next();
    }

    // Actions that require location
    const locationRequiredActions = [
      "prayer_times",
      "qibla_direction",
      "monthly_times",
      "today_prayer",
      "tomorrow_prayer",
    ];

    // Get action from callback or command
    let action = null;
    if (ctx.updateType === "callback_query") {
      action = ctx.callbackQuery?.data;
    } else if (ctx.updateType === "message" && ctx.message?.text) {
      action = ctx.message.text;
    }

    // Check if action requires location
    const requiresLocation =
      action && locationRequiredActions.some((req) => action.includes(req));

    if (requiresLocation) {
      const user = ctx.session.user;
      const hasLocation =
        user &&
        user.location &&
        user.location.latitude &&
        user.location.longitude;

      if (!hasLocation) {
        const lang = getUserLanguage(user);

        await ctx.reply(
          (await t(lang, "location_required")) ||
            "📍 Bu xizmat uchun joylashuvingizni tanlash kerak",
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                (await t(lang, "btn_select_location")) ||
                  "📍 Joylashuv tanlash",
                "enter_location_scene"
              ),
            ],
            [
              Markup.button.callback(
                (await t(lang, "btn_back_menu")) || "🏠 Bosh menyu",
                "back_to_menu"
              ),
            ],
          ])
        );

        return; // Block execution
      }
    }

    return next();
  } catch (error) {
    console.error("Location check middleware error:", error);
    return next();
  }
});

// ========== 6. LOCATION SCENE ENTRY ACTION (Add with other bot.action handlers) ==========

// Entry point for location scene
bot.action("enter_location_scene", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.scene.enter("location_v2");
  } catch (error) {
    console.error("Enter location scene error:", error);
    await ctx.answerCbQuery("❌ Xatolik");
  }
});

// ========== 7. GRACEFUL SHUTDOWN (Add to process handlers, BEFORE process.exit) ==========

// Close Redis connection on shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");

  // Close Redis
  await redisCache.close();
  console.log("✅ Redis connection closed");

  // ... rest of shutdown code ...

  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down gracefully...");

  // Close Redis
  await redisCache.close();
  console.log("✅ Redis connection closed");

  // ... rest of shutdown code ...

  process.exit(0);
});

// ============================================================
// TRANSLATION KEYS TO ADD (Add to config/translations.js)
// ============================================================

const newTranslations = {
  uz: {
    location_required: "📍 Bu xizmat uchun joylashuvingizni tanlash kerak",
    btn_select_location: "📍 Joylashuv tanlash",
    select_location_method: "📍 Joylashuvni qanday tanlaysiz?",
    btn_gps_location: "📍 GPS orqali yuborish",
    send_gps_location:
      "📍 GPS joylashuvingizni yuboring\n\nTelegram'da:\n📎 → Location → Send My Current Location",
    btn_share_location: "📍 Joylashuvni ulashish",
    operation_cancelled: "❌ Bekor qilindi",
  },
  ru: {
    location_required: "📍 Для этого сервиса нужно выбрать местоположение",
    btn_select_location: "📍 Выбрать местоположение",
    select_location_method: "📍 Как выбрать местоположение?",
    btn_gps_location: "📍 Отправить GPS",
    send_gps_location:
      "📍 Отправьте ваше GPS местоположение\n\nВ Telegram:\n📎 → Location → Send My Current Location",
    btn_share_location: "📍 Поделиться местоположением",
    operation_cancelled: "❌ Отменено",
  },
  cr: {
    location_required: "📍 Бу хизмат учун жойлашувингизни танлаш керак",
    btn_select_location: "📍 Жойлашув танлаш",
    select_location_method: "📍 Жойлашувни қандай танлайсиз?",
    btn_gps_location: "📍 GPS орқали юбориш",
    send_gps_location:
      "📍 GPS жойлашувингизни юборинг\n\nTelegram'да:\n📎 → Location → Send My Current Location",
    btn_share_location: "📍 Жойлашувни улашиш",
    operation_cancelled: "❌ Бекор қилинди",
  },
};

// ============================================================
// OPTIONAL: Cache Prayer Times (Update existing getPrayerTimes usage)
// ============================================================

// BEFORE calling getPrayerTimes, try cache:
const cacheKey = `prayer:${latitude}:${longitude}:${date}`;
let prayerData = await redisCache.get(cacheKey);

if (!prayerData) {
  // Cache miss - fetch from API
  prayerData = await getPrayerTimes(latitude, longitude, method, school);

  if (prayerData && prayerData.success) {
    // Cache for 24 hours
    const ttl = await Settings.getSetting("redis_ttl_prayer_times", 86400);
    await redisCache.set(cacheKey, prayerData, ttl);
  }
}

// Use prayerData...

// ============================================================
// DEPLOYMENT CHECKLIST
// ============================================================

/*
✅ 1. Install dependencies:
   npm install ioredis

✅ 2. Install Redis:
   sudo apt install redis-server -y
   sudo systemctl start redis

✅ 3. Seed settings:
   node scripts/setup/setup-advanced-features.js

✅ 4. Reset user locations:
   node scripts/maintenance/reset-locations.js

✅ 5. Enable inline mode in BotFather:
   /setinline @RamazonCalendarBot
   Placeholder: bugun, ertaga, ramazon...

✅ 6. Add code snippets from this file to bot.js

✅ 7. Test:
   - Location selection (GPS, search, list)
   - Inline mode (@RamazonCalendarBot bugun)
   - Redis caching (check with: redis-cli KEYS *)

✅ 8. Deploy:
   pm2 restart ramazonbot-api-9999
   pm2 logs ramazonbot-api-9999

✅ 9. Monitor:
   - Bot logs for "✅ Redis cache connected"
   - Redis keys: redis-cli KEYS *
   - Cache hits in logs: "🎯 Cache HIT: ..."
*/
