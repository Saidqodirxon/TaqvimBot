/**
 * Error Logger Utility
 * Logs errors to Telegram group and console
 */

let botInstance = null;

/**
 * Initialize error logger with bot instance
 * @param {Object} bot - Telegraf bot instance
 */
function initErrorLogger(bot) {
  botInstance = bot;
}

/**
 * Log error to Telegram group
 * @param {Error} error - Error object
 * @param {Object} ctx - Telegraf context (optional)
 * @param {string} location - Where the error occurred
 */
async function logError(error, ctx = null, location = "Unknown") {
  try {
    const errorLogChatId = process.env.ERROR_LOG_CHAT_ID;
    
    if (!errorLogChatId || !botInstance) {
      console.error("❌ Error logger not configured");
      return;
    }

    // Build error message
    let message = `🚨 <b>Bot Error</b>\n\n`;
    message += `📍 <b>Location:</b> ${location}\n`;
    message += `⏰ <b>Time:</b> ${new Date().toLocaleString("uz-UZ")}\n\n`;
    
    // User info if available
    if (ctx?.from) {
      message += `👤 <b>User:</b> ${ctx.from.first_name} (@${ctx.from.username || "N/A"})\n`;
      message += `🆔 <b>User ID:</b> ${ctx.from.id}\n\n`;
    }
    
    // Error details
    message += `❌ <b>Error:</b> ${error.message}\n\n`;
    
    // Stack trace (limited to prevent message too long)
    if (error.stack) {
      const stackLines = error.stack.split("\n").slice(0, 10);
      message += `📋 <b>Stack:</b>\n<code>${stackLines.join("\n")}</code>`;
    }

    // Send to Telegram group
    await botInstance.telegram.sendMessage(errorLogChatId, message, {
      parse_mode: "HTML",
    });

    console.error(`❌ Error logged to Telegram: ${location}`, error);
  } catch (logError) {
    console.error("❌ Failed to log error to Telegram:", logError);
  }
}

/**
 * Log info message to Telegram group
 * @param {string} message - Info message
 * @param {Object} details - Additional details
 */
async function logInfo(message, details = {}) {
  try {
    const errorLogChatId = process.env.ERROR_LOG_CHAT_ID;
    
    if (!errorLogChatId || !botInstance) {
      return;
    }

    let text = `ℹ️ <b>${message}</b>\n\n`;
    text += `⏰ ${new Date().toLocaleString("uz-UZ")}\n\n`;
    
    // Add details
    for (const [key, value] of Object.entries(details)) {
      text += `${key}: ${value}\n`;
    }

    await botInstance.telegram.sendMessage(errorLogChatId, text, {
      parse_mode: "HTML",
    });
  } catch (error) {
    console.error("❌ Failed to log info to Telegram:", error);
  }
}

/**
 * Log warning message to Telegram group
 * @param {string} message - Warning message
 * @param {Object} details - Additional details
 */
async function logWarning(message, details = {}) {
  try {
    const errorLogChatId = process.env.ERROR_LOG_CHAT_ID;
    
    if (!errorLogChatId || !botInstance) {
      return;
    }

    let text = `⚠️ <b>${message}</b>\n\n`;
    text += `⏰ ${new Date().toLocaleString("uz-UZ")}\n\n`;
    
    // Add details
    for (const [key, value] of Object.entries(details)) {
      text += `${key}: ${value}\n`;
    }

    await botInstance.telegram.sendMessage(errorLogChatId, text, {
      parse_mode: "HTML",
    });
  } catch (error) {
    console.error("❌ Failed to log warning to Telegram:", error);
  }
}

module.exports = {
  initErrorLogger,
  logError,
  logInfo,
  logWarning,
};
