const moment = require("moment-timezone");

/**
 * Calculate time remaining until Ramadan
 */
function calculateTimeToRamadan(ramadanDate) {
  const now = moment.tz("Asia/Tashkent");
  const ramadan = moment.tz(ramadanDate, "Asia/Tashkent");

  const duration = moment.duration(ramadan.diff(now));

  return {
    days: Math.floor(duration.asDays()),
    hours: duration.hours(),
    minutes: duration.minutes(),
    seconds: duration.seconds(),
  };
}

/**
 * Get current time
 */
function getCurrentTime() {
  const now = moment.tz("Asia/Tashkent");

  return {
    date: now.format("DD.MM.YYYY"),
    time: now.format("HH:mm:ss"),
  };
}

/**
 * Format date for display
 */
function formatDate(date, format = "DD.MM.YYYY HH:mm") {
  return moment(date).tz("Asia/Tashkent").format(format);
}

/**
 * Check if user is admin
 */
function isAdmin(userId) {
  const adminId = process.env.ADMIN_ID;
  return userId.toString() === adminId;
}

/**
 * Sleep function for delays
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Validate text for inappropriate content
 */
function validateText(text) {
  const inappropriateWords = [
    // Add inappropriate words here
  ];

  const lowerText = text.toLowerCase();
  for (const word of inappropriateWords) {
    if (lowerText.includes(word.toLowerCase())) {
      return false;
    }
  }

  return true;
}

/**
 * Truncate text to specified length
 */
function truncateText(text, maxLength = 100) {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + "...";
}

/**
 * Format number with thousand separators
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/**
 * Generate random ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

module.exports = {
  calculateTimeToRamadan,
  getCurrentTime,
  formatDate,
  isAdmin,
  sleep,
  validateText,
  truncateText,
  formatNumber,
  generateId,
};
