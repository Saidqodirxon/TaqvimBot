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
            message_text: "📍 Avval @RamazonCalendarBot ga o'ting va joylashuvingizni tanlang.",
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
};    await ctx.answerInlineQuery(results, { cache_time: 300 }); // Cache 5 min
  } catch (error) {
    console.error("Inline query error:", error);

    // Show error message
    const results = [
      {
        type: "article",
        id: "error",
        title: "❌ Xatolik yuz berdi",
        description: "Ma'lumotlarni yuklashda muammo",
        input_message_content: {
          message_text: "❌ Xatolik yuz berdi. Keyinroq qayta urinib ko'ring.",
          parse_mode: "HTML",
        },
      },
    ];

    await ctx.answerInlineQuery(results, { cache_time: 10 });
  }
}

/**
 * Get today's prayer times for inline
 */
async function getTodayPrayerTimes(user, latitude, longitude, timezone, lang) {
  try {
    // Skip Redis cache for now - get fresh data
    const method = user.prayerSettings?.calculationMethod || 3;
    const school = user.prayerSettings?.school || 1;

    const prayerData = await getPrayerTimes(
      latitude,
      longitude,
      method,
      school
    );

    if (!prayerData || !prayerData.success || !prayerData.timings) {
      console.error("Invalid prayer data:", prayerData);
      throw new Error("Failed to fetch prayer times");
    }

    // timings is at the top level of prayerData, not under .data
    const timings = prayerData.timings;

    // Validate timings object has required properties
    if (!timings.fajr || !timings.dhuhr) {
      console.error("Missing timing properties:", timings);
      throw new Error("Invalid timings data");
    }

    const today = moment.tz(timezone).format("DD.MM.YYYY");
    const locationName = user.location.name || "Unknown";

    const message =
      `🕌 <b>Bugungi namoz vaqtlari</b>\n` +
      `📅 ${today}\n` +
      `📍 ${locationName}\n\n` +
      `🌅 Bomdod: ${timings.fajr}\n` +
      `☀️ Quyosh chiqishi: ${timings.sunrise}\n` +
      `🌞 Peshin: ${timings.dhuhr}\n` +
      `🌤 Asr: ${timings.asr}\n` +
      `🌆 Shom: ${timings.maghrib}\n` +
      `🌙 Xufton: ${timings.isha}\n\n` +
      `@RamazonCalendarBot`;

    const result = {
      type: "article",
      id: "today",
      title: `📅 Bugungi namoz vaqtlari (${today})`,
      description: `${locationName}: Bomdod ${timings.fajr}, Peshin ${timings.dhuhr}, Asr ${timings.asr}`,
      input_message_content: {
        message_text: message,
        parse_mode: "HTML",
      },
      thumb_url: "https://ramazonbot.saidqodirxon.uz/prayer-icon.png",
    };

    return result;
  } catch (error) {
    console.error("Today prayer times error:", error);
    return {
      type: "article",
      id: "today_error",
      title: "❌ Bugungi vaqtlarni yuklash xatosi",
      description: error.message || "Ma'lumot topilmadi",
      input_message_content: {
        message_text:
          "❌ Bugungi namoz vaqtlarini yuklashda xatolik: " + error.message,
        parse_mode: "HTML",
      },
    };
  }
}

/**
 * Get tomorrow's prayer times for inline
 */
async function getTomorrowPrayerTimes(
  user,
  latitude,
  longitude,
  timezone,
  lang
) {
  try {
    const method = user.prayerSettings?.calculationMethod || 3;
    const school = user.prayerSettings?.school || 1;

    // Get tomorrow's date
    const tomorrow = moment.tz(timezone).add(1, "day");

    // Pass as Date object, not string
    const prayerData = await getPrayerTimes(
      latitude,
      longitude,
      method,
      school,
      0,
      1,
      tomorrow.toDate()
    );

    if (!prayerData || !prayerData.success || !prayerData.timings) {
      console.error("Invalid tomorrow prayer data:", prayerData);
      throw new Error("Failed to fetch prayer times");
    }

    // timings is at the top level of prayerData, not under .data
    const timings = prayerData.timings;

    // Validate timings object has required properties
    if (!timings.fajr || !timings.dhuhr) {
      console.error("Missing tomorrow timing properties:", timings);
      throw new Error("Invalid timings data");
    }

    const tomorrowDate = tomorrow.format("DD.MM.YYYY");
    const locationName = user.location.name || "Unknown";

    const message =
      `🕌 <b>Ertangi namoz vaqtlari</b>\n` +
      `📅 ${tomorrowDate}\n` +
      `📍 ${locationName}\n\n` +
      `🌅 Bomdod: ${timings.fajr}\n` +
      `☀️ Quyosh chiqishi: ${timings.sunrise}\n` +
      `🌞 Peshin: ${timings.dhuhr}\n` +
      `🌤 Asr: ${timings.asr}\n` +
      `🌆 Shom: ${timings.maghrib}\n` +
      `🌙 Xufton: ${timings.isha}\n\n` +
      `@RamazonCalendarBot`;

    const result = {
      type: "article",
      id: "tomorrow",
      title: `📅 Ertangi namoz vaqtlari (${tomorrowDate})`,
      description: `${locationName}: Bomdod ${timings.fajr}, Peshin ${timings.dhuhr}, Asr ${timings.asr}`,
      input_message_content: {
        message_text: message,
        parse_mode: "HTML",
      },
      thumb_url: "https://ramazonbot.saidqodirxon.uz/prayer-icon.png",
    };

    return result;
  } catch (error) {
    console.error("Tomorrow prayer times error:", error);
    return {
      type: "article",
      id: "tomorrow_error",
      title: "❌ Ertangi vaqtlarni yuklash xatosi",
      description: error.message || "Ma'lumot topilmadi",
      input_message_content: {
        message_text:
          "❌ Ertangi namoz vaqtlarini yuklashda xatolik: " + error.message,
        parse_mode: "HTML",
      },
    };
  }
}

/**
 * Get Ramadan countdown for inline
 */
async function getRamadanCountdown(lang, timezone) {
  try {
    const cacheKey = `inline:ramadan:countdown`;
    const cached = await redisCache.get(cacheKey);
    if (cached) return cached;

    // Get Ramadan start date from settings
    const ramadanDateStr = await Settings.getSetting(
      "ramadan_start_date",
      "2026-02-28"
    );
    const ramadanDate = moment.tz(ramadanDateStr, timezone);
    const today = moment.tz(timezone);

    const daysUntil = ramadanDate.diff(today, "days");

    let message, title, description;

    if (daysUntil > 0) {
      message =
        `🌙 <b>Ramazon oyiga qoldi</b>\n\n` +
        `📅 Boshlanish sanasi: ${ramadanDate.format("DD.MM.YYYY")}\n` +
        `⏳ Qolgan kunlar: <b>${daysUntil} kun</b>\n\n` +
        `"Ramazon oyi, unda Qur'on nozil qilingan oy..."\n` +
        `(Baqara surasi, 185-oyat)\n\n` +
        `@RamazonCalendarBot`;

      title = `🌙 Ramazonga ${daysUntil} kun qoldi`;
      description = `Boshlanish: ${ramadanDate.format("DD.MM.YYYY")}`;
    } else if (daysUntil === 0) {
      message =
        `🌙 <b>Ramazon muborak!</b>\n\n` +
        `Bugun Ramazon oyining birinchi kuni!\n\n` +
        `"Ramazon oyi, unda Qur'on nozil qilingan oy..."\n` +
        `(Baqara surasi, 185-oyat)\n\n` +
        `@RamazonCalendarBot`;

      title = `🌙 Ramazon muborak!`;
      description = `Bugun Ramazon oyining birinchi kuni`;
    } else {
      const daysInRamadan = Math.abs(daysUntil);
      const ramadanEnd = ramadanDate.clone().add(29, "days");
      const daysLeft = ramadanEnd.diff(today, "days");

      if (daysLeft > 0) {
        message =
          `🌙 <b>Ramazon oyi</b>\n\n` +
          `📅 ${daysInRamadan}-kun\n` +
          `⏳ Tugashiga ${daysLeft} kun qoldi\n\n` +
          `"O'zingizga taqvo keltirishing uchun ro'za tutish farz qilindi"\n` +
          `(Baqara surasi, 183-oyat)\n\n` +
          `@RamazonCalendarBot`;

        title = `🌙 Ramazon ${daysInRamadan}-kun`;
        description = `Tugashiga ${daysLeft} kun qoldi`;
      } else {
        message =
          `🌙 <b>Ramazon tugadi</b>\n\n` +
          `Hayit muborak! 🎉\n\n` +
          `Qabulli bo'lsin!\n\n` +
          `@RamazonCalendarBot`;

        title = `🌙 Ramazon tugadi - Hayit muborak!`;
        description = `Qabulli bo'lsin! 🎉`;
      }
    }

    const result = {
      type: "article",
      id: "ramadan",
      title: title,
      description: description,
      input_message_content: {
        message_text: message,
        parse_mode: "HTML",
      },
      thumb_url: "https://ramazonbot.saidqodirxon.uz/ramadan-icon.png",
    };

    // Cache for 12 hours
    await redisCache.set(cacheKey, result, 43200);

    return result;
  } catch (error) {
    console.error("Ramadan countdown error:", error);
    return {
      type: "article",
      id: "ramadan_error",
      title: "❌ Ramazon ma'lumotini yuklash xatosi",
      description: "Ma'lumot topilmadi",
      input_message_content: {
        message_text: "❌ Ramazon ma'lumotini yuklashda xatolik",
        parse_mode: "HTML",
      },
    };
  }
}

module.exports = {
  handleInlineQuery,
};
