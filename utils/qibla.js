/**
 * Qibla yo'nalishini hisoblash
 * @param {number} userLat - Foydalanuvchi kenglik
 * @param {number} userLon - Foydalanuvchi uzunlik
 * @returns {number} Qibla yo'nalishi (gradusda, 0-360)
 */
function calculateQibla(userLat, userLon) {
  // Ka'ba koordinatalari (Makkah, Saudiya Arabistoni)
  const KAABA_LAT = 21.4225;
  const KAABA_LON = 39.8262;

  // Koordinatalarni radianlarga o'tkazish
  const userLatRad = toRadians(userLat);
  const userLonRad = toRadians(userLon);
  const kaabaLatRad = toRadians(KAABA_LAT);
  const kaabaLonRad = toRadians(KAABA_LON);

  // Qibla yo'nalishini hisoblash (bearing formula)
  const deltaLon = kaabaLonRad - userLonRad;

  const y = Math.sin(deltaLon) * Math.cos(kaabaLatRad);
  const x =
    Math.cos(userLatRad) * Math.sin(kaabaLatRad) -
    Math.sin(userLatRad) * Math.cos(kaabaLatRad) * Math.cos(deltaLon);

  let bearing = Math.atan2(y, x);
  bearing = toDegrees(bearing);

  // 0-360 oralig'iga keltirish
  bearing = (bearing + 360) % 360;

  return Math.round(bearing);
}

/**
 * Graduslarni radianlarga o'tkazish
 */
function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Radianlarni graduslarga o'tkazish
 */
function toDegrees(radians) {
  return (radians * 180) / Math.PI;
}

/**
 * Qibla yo'nalishini matnli ko'rinishda qaytarish
 * @param {number} bearing - Qibla yo'nalishi (gradusda)
 * @returns {string} Yo'nalish nomi (Shimol, Janub-G'arb, va h.k.)
 */
function getQiblaDirection(bearing) {
  const directions = [
    { name: "Shimol", name_ru: "Север", name_uz: "Shimol" },
    {
      name: "Shimoli-Sharq",
      name_ru: "Северо-восток",
      name_uz: "Shimoliy-Sharq",
    },
    { name: "Sharq", name_ru: "Восток", name_uz: "Sharq" },
    { name: "Janubi-Sharq", name_ru: "Юго-восток", name_uz: "Janubiy-Sharq" },
    { name: "Janub", name_ru: "Юг", name_uz: "Janub" },
    { name: "Janubi-G'arb", name_ru: "Юго-запад", name_uz: "Janubiy-G'arb" },
    { name: "G'arb", name_ru: "Запад", name_uz: "G'arb" },
    {
      name: "Shimoli-G'arb",
      name_ru: "Северо-запад",
      name_uz: "Shimoliy-G'arb",
    },
  ];

  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

/**
 * Qibla masofasini hisoblash (kilometrda)
 * @param {number} userLat - Foydalanuvchi kenglik
 * @param {number} userLon - Foydalanuvchi uzunlik
 * @returns {number} Masofa (km)
 */
function calculateDistanceToKaaba(userLat, userLon) {
  const KAABA_LAT = 21.4225;
  const KAABA_LON = 39.8262;
  const EARTH_RADIUS_KM = 6371;

  const userLatRad = toRadians(userLat);
  const userLonRad = toRadians(userLon);
  const kaabaLatRad = toRadians(KAABA_LAT);
  const kaabaLonRad = toRadians(KAABA_LON);

  const deltaLat = kaabaLatRad - userLatRad;
  const deltaLon = kaabaLonRad - userLonRad;

  // Haversine formula
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(userLatRad) *
      Math.cos(kaabaLatRad) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance);
}

module.exports = {
  calculateQibla,
  getQiblaDirection,
  calculateDistanceToKaaba,
  toRadians,
  toDegrees,
};
