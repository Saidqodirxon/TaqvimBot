const Settings = require("../models/Settings");
const axios = require("axios");

/**
 * Log system - sends important events to log channel
 * Optimized for speed and reliability
 */
class Logger {
  constructor() {
    this.botToken = process.env.BOT_TOKEN;
    this.groupId = process.env.GROUP_ID;
  }

  async send(message, options = {}) {
    // Non-blocking log delivery
    setImmediate(async () => {
      try {
        // Use group ID from env as primary log channel, fallback to database setting
        let logChannel = this.groupId;

        if (!logChannel) {
          const setting = await Settings.findOne({ key: "log_channel" });
          logChannel = setting?.value;
        }

        if (!logChannel) return;

        const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
        await axios
          .post(url, {
            chat_id: logChannel,
            text: message,
            parse_mode: options.parseMode || "HTML",
            disable_web_page_preview: true,
          })
          .catch(() => {}); // Silently fail to avoid crashing the bot
      } catch (error) {
        // External logs should never crash the main process
      }
    });
  }

  // New user registered
  async logNewUser(user, count) {
    const message =
      `👤 <b>#yangi_user</b> (No. ${count || "N/A"})\n\n` +
      `ID: <code>${user.userId}</code>\n` +
      `Ism: ${user.firstName || "N/A"}\n` +
      `Username: ${user.username ? "@" + user.username : "N/A"}\n` +
      `Til: ${user.language || "N/A"}`;

    await this.send(message);
  }

  // Old user returned
  async logReturningUser(user) {
    const message =
      `👤 <b>#eski_user_qaytdi</b>\n\n` +
      `Eski user botni yana ishlatmoqda:\n\n` +
      `ID: <code>${user.userId}</code>\n` +
      `Ism: ${user.firstName || "N/A"}\n` +
      `Username: ${user.username ? "@" + user.username : "N/A"}\n` +
      `Til: ${user.language || "N/A"}`;

    await this.send(message);
  }

  // Veteran user (long term inactive) returned
  async logVeteranReset(user, days) {
    const message =
      `🎖 <b>#veteran_user_reset</b>\n\n` +
      `<b>${days} kundan keyin</b> qaytgan foydalanuvchi tiklandi:\n\n` +
      `ID: <code>${user.userId}</code>\n` +
      `Ism: ${user.firstName || "N/A"}\n` +
      `Kechikish va Shartlar qayta faollashtirildi.`;

    await this.send(message);
  }

  // Broadcast events
  async logBroadcastStart(admin, totalUsers) {
    await this.send(
      `📢 <b>#broadcast_start</b>\nAdmin: ${admin.firstName}\nUsers: ${totalUsers}`
    );
  }

  async logBroadcastComplete(stats) {
    await this.send(
      `✅ <b>#broadcast_finish</b>\nSent: ${stats.sent}\nFailed: ${stats.failed}\nTime: ${stats.duration}`
    );
  }

  // Error log
  async logError(error, context = "") {
    const message =
      `❌ <b>#error</b>\n\n` +
      `<b>Context:</b> ${context}\n` +
      `<b>Message:</b> ${error.message}\n` +
      `<b>Stack:</b> <code>${error.stack?.substring(0, 500)}</code>`;

    await this.send(message);
    console.error(`[Error] ${context}: ${error.message}`);
  }

  // Optimized methods for standard logging
  error(msg, err = null) {
    if (err) this.logError(err, msg);
    else console.error(`[Error] ${msg}`);
  }

  info(message) {
    // Minimal console output for performance
  }

  warn(message) {
    console.warn(`[Warn] ${message}`);
  }

  async logAdminAction(admin, action, details) {
    const name = admin.firstName || admin.username || admin.userId;
    await this.send(
      `⚙️ <b>#admin_action</b>\nAdmin: ${name}\nAction: ${action}\nDetails: ${details}`
    );
  }
}

const logger = new Logger();
module.exports = logger;
