// Helper functions for translations
const translations = require("../config/translations");
const Translation = require("../models/Translation");

// In-memory cache for translations (60 seconds TTL)
let translationCache = {};
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Load all translations from database into cache
 */
async function loadTranslationsToCache() {
  try {
    const now = Date.now();
    // Skip if cache is still valid
    if (cacheTimestamp && now - cacheTimestamp < CACHE_TTL) {
      return;
    }

    const allTranslations = await Translation.find({});
    translationCache = {};

    allTranslations.forEach((tr) => {
      translationCache[tr.key] = {
        uz: tr.uz,
        cr: tr.cr,
        ru: tr.ru,
      };
    });

    cacheTimestamp = now;
  } catch (error) {
    console.error("Error loading translations to cache:", error);
  }
}

/**
 * Get translated text for user
 * @param {string} lang - Language code (uz, cr, ru)
 * @param {string} key - Translation key
 * @param {object} params - Parameters to replace in text
 * @returns {string} Translated text
 */
async function t(lang = "uz", key, params = {}) {
  try {
    // Try to load from cache first
    await loadTranslationsToCache();

    let text;

    // Try database cache first
    if (translationCache[key]) {
      text = translationCache[key][lang] || translationCache[key]["uz"];
    }

    // Fallback to config file
    if (!text) {
      text = translations[lang]?.[key] || translations["uz"]?.[key] || key;
    }

    // Replace parameters
    if (params && Object.keys(params).length > 0) {
      Object.keys(params).forEach((param) => {
        text = text.replace(`{${param}}`, params[param]);
      });
    }

    return text;
  } catch (error) {
    console.error("Translation error:", error);
    // Fallback to config
    return translations[lang]?.[key] || translations["uz"]?.[key] || key;
  }
}

/**
 * Clear translation cache (useful after updates)
 */
function clearTranslationCache() {
  translationCache = {};
  cacheTimestamp = 0;
}

/**
 * Get user's language from database
 * @param {object} user - User object
 * @returns {string} Language code (default: uz)
 */
function getUserLanguage(user) {
  // Agar til tanlanmagan bo'lsa, uz qaytarish (faqat ko'rsatish uchun)
  return user?.language || "uz";
}

module.exports = {
  t,
  getUserLanguage,
  clearTranslationCache,
};
