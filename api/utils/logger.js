const Settings = require("../models/Settings");
const axios = require("axios");

/**
 * Log system - sends important events to log channel from database
 */
class Logger {
  constructor() {
    this.botToken = process.env.BOT_TOKEN;
  }

  async send(message, options = {}) {
    try {
      // Get log channel from database
      const logChannel = await Settings.getSetting("log_channel", null);

      if (!logChannel) {
        console.log(
          "[Logger] Log channel not configured, skipping log:",
          message
        );
        return;
      }

      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      await axios.post(url, {
        chat_id: logChannel,
        text: message,
        parse_mode: options.parseMode || "HTML",
        disable_web_page_preview: options.disablePreview !== false,
      });
    } catch (error) {
      console.error("[Logger] Failed to send log:", error.message);
    }
  }

  // New user registered
  async logNewUser(user) {
    const message =
      `👤 <b>Yangi foydalanuvchi</b>\n\n` +
      `ID: <code>${user.userId}</code>\n` +
      `Ism: ${user.firstName || "N/A"}\n` +
      `Username: ${user.username ? "@" + user.username : "N/A"}\n` +
      `Til: ${user.language}\n` +
      `Vaqt: ${new Date().toLocaleString("uz-UZ")}`;

    await this.send(message);
  }

  // Broadcast started
  async logBroadcastStart(admin, filters, totalUsers) {
    const message =
      `📢 <b>Broadcast boshlandi</b>\n\n` +
      `Admin: ${admin.firstName} (${admin.userId})\n` +
      `Foydalanuvchilar: ${totalUsers}\n` +
      `Filtrlar: ${JSON.stringify(filters)}\n` +
      `Vaqt: ${new Date().toLocaleString("uz-UZ")}`;

    await this.send(message);
  }

  // Broadcast completed
  async logBroadcastComplete(stats) {
    const message =
      `✅ <b>Broadcast tugadi</b>\n\n` +
      `Yuborildi: ${stats.sent}\n` +
      `Xato: ${stats.failed}\n` +
      `Davomiyligi: ${stats.duration}\n` +
      `Vaqt: ${new Date().toLocaleString("uz-UZ")}`;

    await this.send(message);
  }

  // Admin action (add/edit/delete something)
  async logAdminAction(admin, action, details) {
    const message =
      `⚙️ <b>Admin harakati</b>\n\n` +
      `Admin: ${admin.firstName || admin.username || admin.userId}\n` +
      `Harakat: ${action}\n` +
      `Tafsilotlar: ${details}\n` +
      `Vaqt: ${new Date().toLocaleString("uz-UZ")}`;

    await this.send(message);
  }

  // Error log
  async logError(error, context = "") {
    const message =
      `❌ <b>Xatolik</b>\n\n` +
      `Kontekst: ${context}\n` +
      `Xato: ${error.message}\n` +
      `Stack: <pre>${error.stack?.substring(0, 500)}</pre>\n` +
      `Vaqt: ${new Date().toLocaleString("uz-UZ")}`;

    await this.send(message);
  }

  // Standard error logging (console.error replacement)
  error(message, error = null) {
    // Log to console for development
    if (error) {
      console.error(message, error);
    } else {
      console.error(message);
    }

    // Optionally send to Telegram group (only for critical errors)
    if (error && error.stack && this.enabled) {
      this.logError(error, message).catch(() => {
        // Silently fail if Telegram logging fails
      });
    }
  }

  // Info logging
  info(message) {
    console.log(message);
  }

  // Warning logging
  warn(message) {
    console.warn(message);
  }

  // Channel membership check failed
  async logChannelCheckFailed(user, channelUsername) {
    const message =
      `⚠️ <b>Kanal tekshiruvi</b>\n\n` +
      `Foydalanuvchi: ${user.firstName} (${user.userId})\n` +
      `Kanal: @${channelUsername}\n` +
      `Holat: A'zo emas\n` +
      `Vaqt: ${new Date().toLocaleString("uz-UZ")}`;

    await this.send(message);
  }

  // Statistics (can be called daily/weekly)
  async logStatistics(stats) {
    const message =
      `📊 <b>Statistika</b>\n\n` +
      `Jami foydalanuvchilar: ${stats.totalUsers}\n` +
      `Faol: ${stats.activeUsers}\n` +
      `Yangi (24 soat): ${stats.newUsers}\n` +
      `Til: O'zbek - ${stats.uzUsers}, Русский - ${stats.ruUsers}\n` +
      `Vaqt: ${new Date().toLocaleString("uz-UZ")}`;

    await this.send(message);
  }
}

// Singleton instance
const logger = new Logger();

module.exports = logger;
