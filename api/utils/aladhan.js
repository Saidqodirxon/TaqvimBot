const axios = require("axios");
const Location = require("../models/Location");
const MonthlyPrayerTime = require("../models/MonthlyPrayerTime");
const PrayerTimeData = require("../models/PrayerTimeData");

/**
 * Aladhan API dan namoz vaqtlarini olish yoki manual vaqtlarni qaytarish
 * @param {number} latitude - Kenglik
 * @param {number} longitude - Uzunlik
 * @param {number} method - Hisoblash usuli (default: 1 = Karachi)
 * @param {number} school - Mazhab (0 = Shafi, 1 = Hanafi)
 * @param {number} midnightMode - Midnight mode (0 = Standard, 1 = Jafari)
 * @param {number} latitudeAdjustment - Latitude adjustment (always 1 for Uzbekistan)
 * @param {Date} date - Sana (optional, default: bugun)
 * @returns {Promise<Object>} Namoz vaqtlari
 */
async function getPrayerTimes(
  latitude,
  longitude,
  method = 1,
  school = 1,
  midnightMode = 0,
  latitudeAdjustment = 1,
  date = null
) {
  try {
    // Create a clean date object without mutating the parameter
    const targetDate = date ? new Date(date.getTime()) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Create location key and date string for data lookup
    const locationKey = `${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
    const dateStr = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD

    // Priority 0: Check permanent data first (60-day prayer time data)
    try {
      const prayerData = await PrayerTimeData.findOne({
        locationKey,
        date: dateStr,
      }).lean();

      if (prayerData) {
        // console.log(`✅ Prayer data found for ${locationKey} on ${dateStr}`);
        
        // Get hijri date from API if not cached
        let hijriDate = prayerData.hijri || "Unknown";
        if (hijriDate === "Unknown") {
          hijriDate = await getHijriDate();
        }
        
        return {
          success: true,
          date:
            prayerData.date ||
            targetDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
          hijri: hijriDate || "Unknown",
          timings: prayerData.timings,
          meta: {
            latitude: prayerData.latitude,
            longitude: prayerData.longitude,
            timezone: "Asia/Tashkent",
            method: {
              id: prayerData.method || 3,
              name: CALCULATION_METHODS[prayerData.method || 3]?.uz || "Musulmon dunyosi ligasi",
            },
            school: { id: prayerData.school || 1, name: "Hanafi" },
          },
          manual: false,
          cached: false,
          source: "prayer_time_data",
        };
      }
    } catch (dataError) {
      console.error("Prayer data read error:", dataError.message);
      // Continue to other methods if data lookup fails
    }

    // Find location by coordinates
    const location = await Location.findOne({
      latitude,
      longitude,
      isActive: true,
    });

    // Priority 1: Check monthly prayer times
    if (location) {
      const monthlyTime = await MonthlyPrayerTime.findOne({
        locationId: location._id,
        date: targetDate,
      });

      if (monthlyTime) {
        const hijriStr = monthlyTime.hijriDate
          ? `${monthlyTime.hijriDate.month} ${monthlyTime.hijriDate.day}, ${monthlyTime.hijriDate.year}`
          : await getHijriDate();

        return {
          success: true,
          date: targetDate.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          hijri: hijriStr,
          timings: monthlyTime.timings,
          meta: {
            latitude,
            longitude,
            timezone: location.timezone || "Asia/Tashkent",
            method: { id: 99, name: "Manual (Monthly)" },
            school: { id: school, name: school === 1 ? "Hanafi" : "Shafi" },
          },
          manual: true,
          monthly: true,
        };
      }
    }

    // Priority 2: Check static manual prayer times
    if (
      location &&
      location.manualPrayerTimes &&
      location.manualPrayerTimes.enabled
    ) {
      const hijriDate = await getHijriDate();

      return {
        success: true,
        date: targetDate.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        hijri: hijriDate || "Rajab 8, 1447",
        timings: {
          fajr: location.manualPrayerTimes.fajr || "05:30",
          sunrise: location.manualPrayerTimes.sunrise || "06:50",
          dhuhr: location.manualPrayerTimes.dhuhr || "12:25",
          asr: location.manualPrayerTimes.asr || "15:20",
          maghrib: location.manualPrayerTimes.maghrib || "17:01",
          isha: location.manualPrayerTimes.isha || "18:41",
          midnight: "00:00",
          imsak: "05:20",
        },
        meta: {
          latitude,
          longitude,
          timezone: location?.timezone || "Asia/Tashkent",
          method: { id: 99, name: "Manual (Static)" },
          school: { id: school, name: school === 1 ? "Hanafi" : "Shafi" },
        },
        manual: true,
      };
    }

    // Priority 3: Use Aladhan API
    const url = "http://api.aladhan.com/v1/timings";

    // Ensure we use the correct date for the API call
    const apiDate = date ? new Date(date.getTime()) : new Date();
    const timestamp = Math.floor(apiDate.getTime() / 1000);

    const params = {
      latitude,
      longitude,
      method,
      school,
      midnightMode,
      latitudeAdjustmentMethod: latitudeAdjustment,
      timestamp,
      timezonestring: "Asia/Tashkent",
    };

    const response = await axios.get(url, { params });

    if (response.data.code === 200) {
      const timings = response.data.data.timings;
      const dateData = response.data.data.date;

      const result = {
        success: true,
        date: dateData.readable,
        hijri: `${dateData.hijri.month.en} ${dateData.hijri.day}, ${dateData.hijri.year}`,
        timings: {
          fajr: timings.Fajr,
          sunrise: timings.Sunrise,
          dhuhr: timings.Dhuhr,
          asr: timings.Asr,
          maghrib: timings.Maghrib,
          isha: timings.Isha,
          midnight: timings.Midnight,
          imsak: timings.Imsak,
        },
        meta: {
          latitude: response.data.data.meta.latitude,
          longitude: response.data.data.meta.longitude,
          timezone: response.data.data.meta.timezone,
          method: response.data.data.meta.method,
          school: response.data.data.meta.school,
        },
        manual: false,
      };

      // Save to cache (non-blocking)
      savePrayerTimeToCache(
        locationKey,
        dateStr,
        result,
        {
          latitude,
          longitude,
          method,
          school,
          midnightMode,
          latitudeAdjustment,
        },
        "aladhan-api"
      ).catch((err) => {
        console.error("Cache save error:", err.message);
      });

      return result;
    } else {
      const errorMsg = `Aladhan API error: ${response.data.status || "Unknown error"}`;
      console.error(errorMsg, response.data);
      return {
        success: false,
        error: errorMsg,
      };
    }
  } catch (error) {
    const errorMsg =
      error.response?.data?.status || error.message || "API connection failed";
    console.error("Aladhan API xatosi:", errorMsg);
    console.error("Full error:", error);

    // FALLBACK STRATEGY when API fails:

    // 1. Try to get data for this location (any date)
    try {
      const locationKey = `${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
      const lastData = await PrayerTimeData.findOne({
        locationKey,
      })
        .sort({ date: -1 })
        .lean();

      if (lastData) {
        console.log(`⚠️ API failed, using saved data from ${lastData.date}`);
        
        // Get hijri date from API
        const hijriDate = await getHijriDate();
        
        return {
          success: true,
          date: lastData.date,
          hijri: hijriDate || "Unknown",
          timings: lastData.timings,
          meta: {
            latitude: lastData.latitude,
            longitude: lastData.longitude,
            timezone: "Asia/Tashkent",
          },
          manual: false,
          cached: true,
          outdated: true,
          warning: "API ishlamadi, oxirgi saqlangan ma'lumot ko'rsatilmoqda",
        };
      }
    } catch (dataError) {
      console.error("Fallback data error:", dataError.message);
    }

    // 2. Try to get nearby location's data (within 50km)
    try {
      const nearbyData = await PrayerTimeData.findOne({
        latitude: { $gte: latitude - 0.5, $lte: latitude + 0.5 },
        longitude: { $gte: longitude - 0.5, $lte: longitude + 0.5 },
      })
        .sort({ date: -1 })
        .lean();

      if (nearbyData) {
        console.log(`⚠️ Using nearby location data: ${nearbyData.locationKey}`);
        
        // Get hijri date from API
        const hijriDate = await getHijriDate();
        
        return {
          success: true,
          date: nearbyData.date,
          hijri: hijriDate || "Unknown",
          timings: nearbyData.timings,
          meta: {
            latitude: nearbyData.latitude,
            longitude: nearbyData.longitude,
            timezone: "Asia/Tashkent",
          },
          manual: false,
          cached: true,
          outdated: true,
          warning: "API ishlamadi, yaqin joylashuv ma'lumotlari ko'rsatilmoqda",
        };
      }
    } catch (nearbyError) {
      console.error("Nearby cache error:", nearbyError.message);
    }

    // 3. Last resort - return error (NO DEFAULT TASHKENT DATA!)
    console.error(
      `❌ All fallbacks failed for location: ${latitude}, ${longitude}`
    );
    console.error(
      `User should be prompted to set a valid location or try again later.`
    );

    return {
      success: false,
      error: "API_UNAVAILABLE",
      message:
        "Prayer times temporarily unavailable. Please try again later or check your location.",
      latitude,
      longitude,
    };
  }
}

/**
 * Get Hijri date from API
 */
async function getHijriDate() {
  try {
    const response = await axios.get("http://api.aladhan.com/v1/gToH", {
      params: {
        date: new Date()
          .toLocaleDateString("en-GB")
          .split("/")
          .reverse()
          .join("-"),
      },
      timeout: 5000, // 5 seconds timeout
      validateStatus: (status) => status < 500,
    });
    if (response.data.code === 200) {
      const hijri = response.data.data.hijri;
      return `${hijri.month.en} ${hijri.day}, ${hijri.year}`;
    }
  } catch (error) {
    console.error("Hijri date error:", error.message);
  }
  return null;
}

/**
 * Oylik namoz vaqtlarini olish
 * @param {number} latitude - Kenglik
 * @param {number} longitude - Uzunlik
 * @param {number} month - Oy (1-12)
 * @param {number} year - Yil
 * @returns {Promise<Object>} Oylik namoz vaqtlari
 */
async function getMonthlyPrayerTimes(latitude, longitude, month, year) {
  try {
    const url = `http://api.aladhan.com/v1/calendar/${year}/${month}`;

    const params = {
      latitude,
      longitude,
      method: 1, // Karachi University
      school: 1, // Hanafi
      timezonestring: "Asia/Tashkent",
    };

    const response = await axios.get(url, {
      params,
      timeout: 10000, // 10 seconds timeout for monthly data
      validateStatus: (status) => status < 500,
    });

    if (response.data.code === 200) {
      const calendar = response.data.data.map((day) => {
        return {
          date: day.date.readable,
          hijri: `${day.date.hijri.month.en} ${day.date.hijri.day}`,
          timings: {
            fajr: day.timings.Fajr,
            sunrise: day.timings.Sunrise,
            dhuhr: day.timings.Dhuhr,
            asr: day.timings.Asr,
            maghrib: day.timings.Maghrib,
            isha: day.timings.Isha,
          },
        };
      });

      return {
        success: true,
        month,
        year,
        calendar,
      };
    } else {
      console.error("Monthly prayer times API error:", response.data.status);
      return {
        success: false,
        error: response.data.status || "API error",
      };
    }
  } catch (error) {
    console.error("Aladhan API xatosi:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Yaqin namoz vaqtini aniqlash
 * @param {Object} timings - Namoz vaqtlari
 * @returns {Object} Keyingi namoz
 */
function getNextPrayer(timings) {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const prayers = [
    { name: "Bomdod", time: timings.fajr },
    { name: "Quyosh", time: timings.sunrise },
    { name: "Peshin", time: timings.dhuhr },
    { name: "Asr", time: timings.asr },
    { name: "Shom", time: timings.maghrib },
    { name: "Xufton", time: timings.isha },
  ];

  for (const prayer of prayers) {
    const [hours, minutes] = prayer.time.split(":").map(Number);
    const prayerTime = hours * 60 + minutes;

    if (prayerTime > currentTime) {
      const diff = prayerTime - currentTime;
      const hoursLeft = Math.floor(diff / 60);
      const minutesLeft = diff % 60;

      return {
        name: prayer.name,
        time: prayer.time,
        remaining: `${hoursLeft} soat ${minutesLeft} daqiqa`,
      };
    }
  }

  // Agar barcha namozlar o'tgan bo'lsa, ertangi bomdodni ko'rsat
  const [hours, minutes] = prayers[0].time.split(":").map(Number);
  const prayerTime = hours * 60 + minutes;
  const diff = 24 * 60 - currentTime + prayerTime;
  const hoursLeft = Math.floor(diff / 60);
  const minutesLeft = diff % 60;

  return {
    name: prayers[0].name,
    time: prayers[0].time,
    remaining: `${hoursLeft} soat ${minutesLeft} daqiqa`,
  };
}

/**
 * Qibla yo'nalishini hisoblash (Kaaba nuqtasiga nisbatan)
 * Kaaba: 21.4225°N, 39.8262°E (Makkah, Saudi Arabia)
 * @param {number} latitude - Foydalanuvchi kenglik
 * @param {number} longitude - Foydalanuvchi uzunlik
 * @returns {Object} Qibla yo'nalishi (daraja)
 */
function getQiblaDirection(latitude, longitude) {
  // Kaaba koordinatalari
  const kaabaLat = 21.4225;
  const kaabaLon = 39.8262;

  // Radianга o'tkazish
  const lat1 = (latitude * Math.PI) / 180;
  const lat2 = (kaabaLat * Math.PI) / 180;
  const lon1 = (longitude * Math.PI) / 180;
  const lon2 = (kaabaLon * Math.PI) / 180;

  // Qibla yo'nalishini hisoblash (bearing formula)
  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  let bearing = Math.atan2(y, x);

  // Darajaga o'tkazish va 0-360 oralig'iga keltirish
  bearing = (bearing * 180) / Math.PI;
  bearing = (bearing + 360) % 360;

  // Yo'nalish nomini aniqlash
  let direction = "";
  if (bearing >= 337.5 || bearing < 22.5) direction = "Shimol ↑";
  else if (bearing >= 22.5 && bearing < 67.5) direction = "Shimoli-sharq ↗";
  else if (bearing >= 67.5 && bearing < 112.5) direction = "Sharq →";
  else if (bearing >= 112.5 && bearing < 157.5) direction = "Janubi-sharq ↘";
  else if (bearing >= 157.5 && bearing < 202.5) direction = "Janub ↓";
  else if (bearing >= 202.5 && bearing < 247.5) direction = "Janubi-g'arb ↙";
  else if (bearing >= 247.5 && bearing < 292.5) direction = "G'arb ←";
  else if (bearing >= 292.5 && bearing < 337.5) direction = "Shimoli-g'arb ↖";

  // Masofani hisoblash (Haversine formula)
  const R = 6371; // Yer radiusi (km)
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return {
    bearing: Math.round(bearing * 10) / 10, // 1 kasr raqamgacha
    direction,
    distance: Math.round(distance), // km
    kaaba: {
      latitude: kaabaLat,
      longitude: kaabaLon,
    },
  };
}

/**
 * Calculation method nomlari
 */
const CALCULATION_METHODS = {
  0: {
    en: "Jafari (Shia Ithna Ashari)",
    uz: "Jafari mazhabi (Shia)",
    cr: "Жафари мазҳаби (Шиа)",
    ru: "Джафаритский мазхаб (Шииты)",
  },
  1: {
    en: "University of Islamic Sciences, Karachi",
    uz: "Karachi universiteti",
    cr: "Карачи университети",
    ru: "Университет Карачи",
  },
  2: {
    en: "Islamic Society of North America (ISNA)",
    uz: "Shimoliy Amerika islom jamiyati (ISNA)",
    cr: "Шимолий Америка ислом жамияти (ИСНА)",
    ru: "Исламское общество Северной Америки (ISNA)",
  },
  3: {
    en: "Muslim World League",
    uz: "Musulmon dunyosi ligasi",
    cr: "Муслимон дунёси лигаси",
    ru: "Мусульманская мировая лига",
  },
  4: {
    en: "Umm al-Qura, Makkah",
    uz: "Umm al-Qura universiteti (Makka)",
    cr: "Умм аль-Қура университети (Макка)",
    ru: "Университет Умм аль-Кура (Мекка)",
  },
  5: {
    en: "Egyptian General Authority of Survey",
    uz: "Misr usuli",
    cr: "Миср усули",
    ru: "Египетский метод",
  },
  7: {
    en: "Institute of Geophysics, University of Tehran",
    uz: "Tehron universiteti",
    cr: "Теҳрон университети",
    ru: "Тегеранский университет",
  },
  8: {
    en: "Gulf Region",
    uz: "Fors ko'rfazi mintaqasi",
    cr: "Форс кўрфази минтақаси",
    ru: "Регион Персидского залива",
  },
  9: {
    en: "Kuwait",
    uz: "Quvayt",
    cr: "Қувайт",
    ru: "Кувейт",
  },
  10: {
    en: "Qatar",
    uz: "Qatar",
    cr: "Қатар",
    ru: "Катар",
  },
  11: {
    en: "Majlis Ugama Islam Singapura, Singapore",
    uz: "Singapur",
    cr: "Сингапур",
    ru: "Сингапур",
  },
  12: {
    en: "Union Organization islamic de France",
    uz: "Frantsiya islom tashkilotlari ittifoqi",
    cr: "Франция ислом ташкилотлари иттифоқи",
    ru: "Союз исламских организаций Франции",
  },
  13: {
    en: "Diyanet İşleri Başkanlığı, Turkey",
    uz: "Turkiya diniy ishlar boshqarmasi",
    cr: "Туркия диний ишлар бошқармаси",
    ru: "Управление по делам религии Турции",
  },
  14: {
    en: "Spiritual Administration of Muslims of Russia",
    uz: "Rossiya musulmonlari ma'muriyati",
    cr: "Россия мусулмонлари маъмурияти",
    ru: "Духовное управление мусульман России",
  },
};

/**
 * Save prayer time to permanent data storage (60-day data)
 * @param {string} locationKey - Location identifier
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @param {Object} prayerData - Prayer time data
 * @param {Object} settings - Calculation settings
 * @param {string} source - Data source (aladhan-api, monthly, manual)
 */
async function savePrayerTimeToCache(
  locationKey,
  dateStr,
  prayerData,
  settings,
  source = "aladhan-api"
) {
  try {
    const [lat, lon] = locationKey.split("_").map(Number);

    // Get city info from Location model
    const Location = require("../models/Location");
    const location = await Location.findOne({
      latitude: { $gte: lat - 0.001, $lte: lat + 0.001 },
      longitude: { $gte: lon - 0.001, $lte: lon + 0.001 },
      isActive: true,
    }).lean();

    const dataEntry = {
      locationKey,
      latitude: lat,
      longitude: lon,
      cityName: location?.name || "Unknown",
      cityNameUz: location?.nameUz || "",
      cityNameRu: location?.nameRu || "",
      region: location?.region || "",
      date: dateStr,
      timings: prayerData.timings,
      method: typeof settings?.method === "number" ? settings.method : 3,
      school: typeof settings?.school === "number" ? settings.school : 1,
      createdAt: new Date(),
    };

    await PrayerTimeData.findOneAndUpdate(
      { locationKey, date: dateStr },
      dataEntry,
      { upsert: true, new: true }
    );

    // console.log(`💾 Saved prayer data for ${locationKey} on ${dateStr}`);
  } catch (error) {
    console.error("Failed to save prayer data:", error.message);
    // DO NOT throw - save is non-critical
  }
}

/**
 * Mazhab nomlari
 */
const SCHOOLS = {
  0: { en: "Shafi", uz: "Shofeiy mazhabı", cr: "Шофеий мазҳаби" },
  1: { en: "Hanafi", uz: "Hanafiy mazhabı", cr: "Ҳанафий мазҳаби" },
};

module.exports = {
  getPrayerTimes,
  getMonthlyPrayerTimes,
  getNextPrayer,
  getQiblaDirection,
  savePrayerTimeToCache,
  CALCULATION_METHODS,
  SCHOOLS,
};
