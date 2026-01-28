const moment = require("moment-timezone");
const { t, getUserLanguage } = require("./translator");
const { getPrayerTimes } = require("./aladhan");
const User = require("../models/User");
const Settings = require("../models/Settings");

// In-memory cache for inline queries (5 min TTL)
const inlineCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const cached = inlineCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  inlineCache.delete(key);
  return null;
}

function setCache(key, data) {
  inlineCache.set(key, { data, timestamp: Date.now() });
  // Clean old cache entries periodically
  if (inlineCache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of inlineCache) {
      if (now - v.timestamp > CACHE_TTL) {
        inlineCache.delete(k);
      }
    }
  }
}

/**
 * Handle inline queries - OPTIMIZED for speed (< 500ms)
 * Uses in-memory caching to avoid database hits
 */
async function handleInlineQuery(ctx) {
  try {
    const startTime = Date.now();
    const query = ctx.inlineQuery.query.toLowerCase().trim();
    const userId = ctx.inlineQuery.from.id;

    // Check cache first
    const cacheKey = `inline:${userId}:${query || "default"}`;
    const cached = getCached(cacheKey);
    if (cached) {
      await ctx.answerInlineQuery(cached, { cache_time: 300 });
      console.log(`⚡ Inline query cached: ${Date.now() - startTime}ms`);
      return;
    }

    // Get user data with minimal fields
    const user = await User.findOne({ userId })
      .select("userId location prayerSettings language")
      .lean();

    // If user not registered or no location
    if (!user || !user.location || !user.location.latitude) {
      const results = [
        {
          type: "article",
          id: "1",
          title: "⚠️ Botga ro'yxatdan o'tish kerak",
          description: "Avval @RamazonCalendarBot ga /start bosing",
          input_message_content: {
            message_text:
              "📍 Avval @RamazonCalendarBot ga o'ting va joylashuvingizni tanlang.",
            parse_mode: "HTML",
          },
        },
      ];
      await ctx.answerInlineQuery(results, { cache_time: 60 });
      return;
    }

    const { latitude, longitude } = user.location;
    const timezone = user.location.timezone || "Asia/Tashkent";
    const locationName = user.location.name || "Joylashuv";

    // Get prayer times (already optimized with caching in aladhan.js)
    const prayerData = await getPrayerTimes(latitude, longitude, 3, 1);

    if (!prayerData || !prayerData.success || !prayerData.timings) {
      const results = [
        {
          type: "article",
          id: "error",
          title: "❌ Xatolik",
          description: "Namoz vaqtlarini olishda xatolik",
          input_message_content: {
            message_text: "❌ Namoz vaqtlarini olishda xatolik yuz berdi.",
            parse_mode: "HTML",
          },
        },
      ];
      await ctx.answerInlineQuery(results, { cache_time: 30 });
      return;
    }

    const timings = prayerData.timings;
    const today = moment.tz(timezone).format("DD.MM.YYYY");

    // Build results based on query
    let results = [];

    // Today's prayer times (default)
    const todayMessage =
      `🕌 <b>Bugungi namoz vaqtlari</b>\n` +
      `📅 ${today}\n` +
      `📍 ${locationName}\n\n` +
      `🌅 Bomdod: ${timings.fajr}\n` +
      `☀️ Quyosh: ${timings.sunrise}\n` +
      `🌞 Peshin: ${timings.dhuhr}\n` +
      `🌤 Asr: ${timings.asr}\n` +
      `🌆 Shom: ${timings.maghrib}\n` +
      `🌙 Xufton: ${timings.isha}\n\n` +
      `@RamazonCalendarBot`;

    const todayResult = {
      type: "article",
      id: "today",
      title: `📅 Bugungi namoz vaqtlari (${today})`,
      description: `${locationName}: Bomdod ${timings.fajr}, Shom ${timings.maghrib}`,
      input_message_content: {
        message_text: todayMessage,
        parse_mode: "HTML",
      },
    };

    if (query === "" || query.includes("bugun") || query.includes("today")) {
      results.push(todayResult);
    }

    // Tomorrow (only if explicitly requested)
    if (query.includes("ertaga") || query.includes("tomorrow")) {
      const tomorrow = moment.tz(timezone).add(1, "day");
      const tomorrowStr = tomorrow.format("DD.MM.YYYY");

      results.push({
        type: "article",
        id: "tomorrow",
        title: `📅 Ertangi namoz vaqtlari (${tomorrowStr})`,
        description: `${locationName}`,
        input_message_content: {
          message_text: `🕌 <b>Ertangi namoz vaqtlari</b>\n📅 ${tomorrowStr}\n📍 ${locationName}\n\n@RamazonCalendarBot`,
          parse_mode: "HTML",
        },
      });
    }

    // Ramadan countdown
    if (query.includes("ramazon") || query.includes("ramadan")) {
      const ramadanDate = moment.tz("2026-02-28", timezone);
      const daysUntil = ramadanDate.diff(moment.tz(timezone), "days");

      results.push({
        type: "article",
        id: "ramadan",
        title: `🌙 Ramazonga ${daysUntil} kun qoldi`,
        description: "Ramazon oyi boshlanishiga",
        input_message_content: {
          message_text: `🌙 <b>Ramazon oyiga ${daysUntil} kun qoldi</b>\n\n📅 Boshlanish: 28.02.2026\n\n@RamazonCalendarBot`,
          parse_mode: "HTML",
        },
      });
    }

    // If no specific query, show today
    if (results.length === 0) {
      results.push(todayResult);
    }

    // Cache and respond
    setCache(cacheKey, results);
    await ctx.answerInlineQuery(results, { cache_time: 300 });

    console.log(`⚡ Inline query: ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error("Inline query error:", error);

    const results = [
      {
        type: "article",
        id: "error",
        title: "❌ Xatolik yuz berdi",
        description: error.message || "Keyinroq urinib ko'ring",
        input_message_content: {
          message_text: "❌ Xatolik yuz berdi. Keyinroq qayta urinib ko'ring.",
          parse_mode: "HTML",
        },
      },
    ];

    await ctx.answerInlineQuery(results, { cache_time: 10 });
  }
}

module.exports = {
  handleInlineQuery,
};
