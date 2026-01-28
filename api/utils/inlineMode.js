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

    // Inline queries MUST respond within 30 seconds, ideally < 5 seconds
    const INLINE_TIMEOUT = 25000; // 25 seconds safety margin
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Inline query timeout")),
        INLINE_TIMEOUT
      )
    );

    const processQuery = async () => {
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

      // Get prayer times with retry (already optimized with caching in aladhan.js)
      let prayerData;
      let retries = 0;
      const maxRetries = 2;

      while (retries <= maxRetries) {
        try {
          prayerData = await getPrayerTimes(latitude, longitude, 3, 1);
          if (prayerData && prayerData.success && prayerData.timings) {
            break; // Success, exit retry loop
          }
          retries++;
          if (retries <= maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 200)); // Wait 200ms before retry
          }
        } catch (err) {
          console.error(
            `Inline query prayer fetch attempt ${retries + 1} failed:`,
            err.message
          );
          retries++;
          if (retries <= maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        }
      }

      if (!prayerData || !prayerData.success || !prayerData.timings) {
        console.error(
          "Inline query: Failed to fetch prayer times after retries",
          { userId, retries }
        );
        const results = [
          {
            type: "article",
            id: "error",
            title: "❌ Xatolik",
            description: "Namoz vaqtlarini olishda xatolik",
            input_message_content: {
              message_text:
                "❌ Namoz vaqtlarini olishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
              parse_mode: "HTML",
            },
          },
        ];
        await ctx.answerInlineQuery(results, { cache_time: 30 });
        return;
      }

      const timings = prayerData.timings;

      // Validate that all required timings exist
      if (
        !timings ||
        !timings.fajr ||
        !timings.dhuhr ||
        !timings.asr ||
        !timings.maghrib ||
        !timings.isha
      ) {
        console.error("Inline query: Missing prayer timings", {
          timings,
          userId,
        });
        const results = [
          {
            type: "article",
            id: "error",
            title: "❌ Ma'lumot to'liq emas",
            description: "Namoz vaqtlari ma'lumoti topilmadi",
            input_message_content: {
              message_text:
                "❌ Namoz vaqtlari ma'lumoti topilmadi. Keyinroq qayta urinib ko'ring.",
              parse_mode: "HTML",
            },
          },
        ];
        await ctx.answerInlineQuery(results, { cache_time: 30 });
        return;
      }

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
    };

    // Race between timeout and actual processing
    await Promise.race([processQuery(), timeoutPromise]);
  } catch (error) {
    console.error("Inline query error:", error);

    // Always respond to avoid "query expired" errors
    try {
      const results = [
        {
          type: "article",
          id: "error",
          title: "❌ Xatolik yuz berdi",
          description:
            error.message === "Inline query timeout"
              ? "Vaqt tugadi"
              : "Keyinroq urinib ko'ring",
          input_message_content: {
            message_text:
              "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.\n\n@RamazonCalendarBot",
            parse_mode: "HTML",
          },
        },
      ];

      await ctx.answerInlineQuery(results, { cache_time: 10 });
    } catch (answerError) {
      console.error(
        "Failed to answer inline query with error:",
        answerError.message
      );
    }
  }
}

module.exports = {
  handleInlineQuery,
};
