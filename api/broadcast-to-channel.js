/**
 * Broadcast message to channel asking users to restart bot
 * This is the ONLY way to recover lost users via Telegram
 */

require("dotenv/config");
const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);

async function broadcastToChannel() {
  try {
    const channelId =
      process.env.GREETING_CHANNEL_ID || process.env.REQUIRED_CHANNEL;

    if (!channelId) {
      console.error("❌ Channel ID not found in .env");
      console.log("Set GREETING_CHANNEL_ID or REQUIRED_CHANNEL in .env file");
      process.exit(1);
    }

    const message = `📢 <b>Muhim xabar!</b>

Hurmatli foydalanuvchilar! Bot yangilandi va database qayta tiklandi.

Iltimos, botni qaytadan ishga tushiring:
👉 @${process.env.BOT_USER}

<b>Agar ilgari botdan foydalangan bo'lsangiz, /start ni qayta bosing!</b>

Bu bir martalik jarayon. Rahmat! 🙏`;

    await bot.telegram.sendMessage(channelId, message, {
      parse_mode: "HTML",
    });

    console.log("✅ Message sent to channel successfully!");
    console.log("\nUsers who see this message can /start the bot again");

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to send message:", error);
    process.exit(1);
  }
}

broadcastToChannel();
