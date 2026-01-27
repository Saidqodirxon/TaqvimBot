const { Telegraf } = require("telegraf");
require("dotenv").config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const adminId = process.env.ADMIN_ID;

async function testLocationRequest() {
  try {
    const message = `🕌 <b>Muhim xabar!</b>

Botimiz yangilandi va endi 232 ta O'zbekiston shahri uchun namoz vaqtlari mavjud!

⚠️ <b>Joylashuvingizni tanlang</b>
Namoz vaqtlarini olish uchun shaharingizni tanlashingiz kerak.

👇 Quyidagi tugmalardan birini bosing:`;

    await bot.telegram.sendMessage(adminId, message, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📍 Joylashuvni tanlash",
              callback_data: "enter_location_scene",
            },
          ],
          [
            {
              text: "🔄 Botni qayta ishga tushirish",
              callback_data: "restart_bot",
            },
          ],
        ],
      },
    });

    console.log(`✅ Test message sent to admin (${adminId})`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testLocationRequest();
