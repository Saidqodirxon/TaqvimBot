const Settings = require("../models/Settings");
const axios = require("axios");

/**
 * Log system - sends important events to GROUP_ID
 */
class Logger {
  constructor() {
    this.groupId = process.env.GROUP_ID;
    this.botToken = process.env.BOT_TOKEN;
    this.enabled = !!this.groupId;
  }

  async send(message, options = {}) {
    if (!this.enabled) {
      console.log("[Logger] GROUP_ID not configured, skipping log:", message);
      return;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      await axios.post(url, {
        chat_id: this.groupId,
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
