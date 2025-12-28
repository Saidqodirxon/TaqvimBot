// Helper functions for translations
const translations = require("../config/translations");

/**
 * Get translated text for user
 * @param {string} lang - Language code (uz, cr, ru)
 * @param {string} key - Translation key
 * @param {object} params - Parameters to replace in text
 * @returns {string} Translated text
 */
function t(lang = "uz", key, params = {}) {
  try {
    let text = translations[lang][key] || translations["uz"][key] || key;

    // Replace parameters
    if (params && Object.keys(params).length > 0) {
      Object.keys(params).forEach((param) => {
        text = text.replace(`{${param}}`, params[param]);
      });
    }

    return text;
  } catch (error) {
    console.error("Translation error:", error);
    return key;
  }
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
};
