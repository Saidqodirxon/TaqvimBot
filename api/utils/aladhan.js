const axios = require("axios");
const Location = require("../models/Location");
const MonthlyPrayerTime = require("../models/MonthlyPrayerTime");

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

      return {
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
    } else {
      throw new Error("API qaytardi: " + response.data.status);
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

    const response = await axios.get(url, { params });

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
      throw new Error("API qaytardi: " + response.data.status);
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
    uz: "Jafari (Shia)",
    cr: "Жафари (Шиа)",
  },
  1: {
    en: "University of Islamic Sciences, Karachi",
    uz: "Karachi universiteti",
    cr: "Карачи университети",
  },
  2: {
    en: "Islamic Society of North America (ISNA)",
    uz: "ISNA (Shimoli Amerika)",
    cr: "ИСНА (Шимолий Америка)",
  },
  3: {
    en: "Muslim World League",
    uz: "Musulmonlar dunyosi ligasi",
    cr: "Муслимонлар дунёси лигаси",
  },
  4: {
    en: "Umm al-Qura, Makkah",
    uz: "Umm al-Qura (Makka)",
    cr: "Умм аль-Қура (Макка)",
  },
  5: {
    en: "Egyptian General Authority of Survey",
    uz: "Misr (Usul)",
    cr: "Миср (Усул)",
  },
  7: {
    en: "Institute of Geophysics, University of Tehran",
    uz: "Tehran universiteti",
    cr: "Теҳрон университети",
  },
  8: { en: "Gulf Region", uz: "Fors ko'rfazi", cr: "Форс кўрфази" },
  9: { en: "Kuwait", uz: "Quvayt", cr: "Қувайт" },
  10: { en: "Qatar", uz: "Qatar", cr: "Қатар" },
  11: {
    en: "Majlis Ugama Islam Singapura, Singapore",
    uz: "Singapur",
    cr: "Сингапур",
  },
  12: {
    en: "Union Organization islamic de France",
    uz: "Frantsiya",
    cr: "Франция",
  },
  13: { en: "Diyanet İşleri Başkanlığı, Turkey", uz: "Turkiya", cr: "Туркия" },
  14: {
    en: "Spiritual Administration of Muslims of Russia",
    uz: "Rossiya",
    cr: "Россия",
  },
};

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
  CALCULATION_METHODS,
  SCHOOLS,
};
