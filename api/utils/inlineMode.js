const moment = require("moment-timezone");
const { t, getUserLanguage } = require("./translator");
const { getPrayerTimes } = require("./aladhan");
const User = require("../models/User");
const Settings = require("../models/Settings");
const redisCache = require("./redis");

/**
 * Handle inline queries
 * Allows users to share prayer times in any chat
 * Examples:
 * - "today" - today's prayer times
 * - "tomorrow" - tomorrow's prayer times
 * - "ramadan" - days until Ramadan
 */
async function handleInlineQuery(ctx) {
  try {
    const query = ctx.inlineQuery.query.toLowerCase().trim();
    const userId = ctx.inlineQuery.from.id;

    // Get user data
    const user = await User.findOne({ userId });

    // If user not registered or no location
    if (!user || !user.location || !user.location.latitude) {
      const results = [
        {
          type: "article",
          id: "1",
          title: "⚠️ Botga ro'yxatdan o'tish kerak",
          description:
            "Avval @RamazonCalendarBot ga /start bosing va joylashuvni tanlang",
          input_message_content: {
            message_text:
              "📍 Namoz vaqtlarini ko'rish uchun avval @RamazonCalendarBot ga o'ting va joylashuvingizni tanlang.",
            parse_mode: "HTML",
          },
        },
      ];

      return await ctx.answerInlineQuery(results, { cache_time: 10 });
    }

    const lang = getUserLanguage(user);
    const { latitude, longitude } = user.location;
    const timezone = user.location.timezone || "Asia/Tashkent";

    let results = [];

    // Today's prayer times
    if (query.includes("bugun") || query.includes("today") || query === "") {
      const todayData = await getTodayPrayerTimes(
        user,
        latitude,
        longitude,
        timezone,
        lang
      );
      results.push(todayData);
    }

    // Tomorrow's prayer times
    if (query.includes("ertaga") || query.includes("tomorrow")) {
      const tomorrowData = await getTomorrowPrayerTimes(
        user,
        latitude,
        longitude,
        timezone,
        lang
      );
      results.push(tomorrowData);
    }

    // Days until Ramadan
    if (query.includes("ramazon") || query.includes("ramadan")) {
      const ramadanData = await getRamadanCountdown(lang, timezone);
      results.push(ramadanData);
    }

    // If no matches, show all options
    if (results.length === 0) {
      const todayData = await getTodayPrayerTimes(
        user,
        latitude,
        longitude,
        timezone,
        lang
      );
      const tomorrowData = await getTomorrowPrayerTimes(
        user,
        latitude,
        longitude,
        timezone,
        lang
      );
      const ramadanData = await getRamadanCountdown(lang, timezone);

      results = [todayData, tomorrowData, ramadanData];
    }

    await ctx.answerInlineQuery(results, { cache_time: 300 }); // Cache 5 min
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
    const cacheKey = `inline:today:${user.userId}`;
    const cached = await redisCache.get(cacheKey);
    if (cached) return cached;

    const method = user.prayerSettings?.calculationMethod || 3;
    const school = user.prayerSettings?.school || 0;

    const prayerData = await getPrayerTimes(
      latitude,
      longitude,
      method,
      school
    );

    if (!prayerData || !prayerData.success) {
      throw new Error("Failed to fetch prayer times");
    }

    const timings = prayerData.data.timings;
    const today = moment.tz(timezone).format("DD.MM.YYYY");
    const locationName = user.location.name || "Unknown";

    const message =
      `🕌 <b>Bugungi namoz vaqtlari</b>\n` +
      `📅 ${today}\n` +
      `📍 ${locationName}\n\n` +
      `🌅 Bomdod: ${timings.Fajr}\n` +
      `☀️ Quyosh chiqishi: ${timings.Sunrise}\n` +
      `🌞 Peshin: ${timings.Dhuhr}\n` +
      `🌤 Asr: ${timings.Asr}\n` +
      `🌆 Shom: ${timings.Maghrib}\n` +
      `🌙 Xufton: ${timings.Isha}\n\n` +
      `@RamazonCalendarBot`;

    const result = {
      type: "article",
      id: "today",
      title: `📅 Bugungi namoz vaqtlari (${today})`,
      description: `${locationName}: Bomdod ${timings.Fajr}, Peshin ${timings.Dhuhr}, Asr ${timings.Asr}`,
      input_message_content: {
        message_text: message,
        parse_mode: "HTML",
      },
      thumb_url: "https://ramazonbot.saidqodirxon.uz/prayer-icon.png",
    };

    // Cache for 1 hour
    await redisCache.set(cacheKey, result, 3600);

    return result;
  } catch (error) {
    console.error("Today prayer times error:", error);
    return {
      type: "article",
      id: "today_error",
      title: "❌ Bugungi vaqtlarni yuklash xatosi",
      description: "Ma'lumot topilmadi",
      input_message_content: {
        message_text: "❌ Bugungi namoz vaqtlarini yuklashda xatolik",
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
    const cacheKey = `inline:tomorrow:${user.userId}`;
    const cached = await redisCache.get(cacheKey);
    if (cached) return cached;

    const method = user.prayerSettings?.calculationMethod || 3;
    const school = user.prayerSettings?.school || 0;

    // Get tomorrow's date
    const tomorrow = moment.tz(timezone).add(1, "day");
    const tomorrowStr = tomorrow.format("DD-MM-YYYY");

    const prayerData = await getPrayerTimes(
      latitude,
      longitude,
      method,
      school,
      0,
      1,
      tomorrowStr
    );

    if (!prayerData || !prayerData.success) {
      throw new Error("Failed to fetch prayer times");
    }

    const timings = prayerData.data.timings;
    const tomorrowDate = tomorrow.format("DD.MM.YYYY");
    const locationName = user.location.name || "Unknown";

    const message =
      `🕌 <b>Ertangi namoz vaqtlari</b>\n` +
      `📅 ${tomorrowDate}\n` +
      `📍 ${locationName}\n\n` +
      `🌅 Bomdod: ${timings.Fajr}\n` +
      `☀️ Quyosh chiqishi: ${timings.Sunrise}\n` +
      `🌞 Peshin: ${timings.Dhuhr}\n` +
      `🌤 Asr: ${timings.Asr}\n` +
      `🌆 Shom: ${timings.Maghrib}\n` +
      `🌙 Xufton: ${timings.Isha}\n\n` +
      `@RamazonCalendarBot`;

    const result = {
      type: "article",
      id: "tomorrow",
      title: `📅 Ertangi namoz vaqtlari (${tomorrowDate})`,
      description: `${locationName}: Bomdod ${timings.Fajr}, Peshin ${timings.Dhuhr}, Asr ${timings.Asr}`,
      input_message_content: {
        message_text: message,
        parse_mode: "HTML",
      },
      thumb_url: "https://ramazonbot.saidqodirxon.uz/prayer-icon.png",
    };

    // Cache for 12 hours
    await redisCache.set(cacheKey, result, 43200);

    return result;
  } catch (error) {
    console.error("Tomorrow prayer times error:", error);
    return {
      type: "article",
      id: "tomorrow_error",
      title: "❌ Ertangi vaqtlarni yuklash xatosi",
      description: "Ma'lumot topilmadi",
      input_message_content: {
        message_text: "❌ Ertangi namoz vaqtlarini yuklashda xatolik",
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
