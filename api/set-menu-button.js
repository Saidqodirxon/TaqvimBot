require("dotenv").config();
const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);

// Test user ID (sizning ID)
const TEST_USER_ID = 1551855614;

async function setMenuButton() {
  try {
    console.log("🔧 Setting menu button...");
    console.log("User ID:", TEST_USER_ID);
    console.log("Mini App URL:", process.env.MINI_APP_URL);

    await bot.telegram.setChatMenuButton({
      chat_id: TEST_USER_ID,
      menu_button: {
        type: "web_app",
        text: "📅 Taqvim",
        web_app: {
          url: `${process.env.MINI_APP_URL}?userId=${TEST_USER_ID}`,
        },
      },
    });

    console.log("✅ Menu button set successfully!");
    console.log("");
    console.log(
      "📱 Endi Telegram botingizga boring va quyidagilarni tekshiring:"
    );
    console.log("   1. Botga /start yuboring");
    console.log('   2. Keyboard yonidagi "≡" (menu) tugmasini bosing');
    console.log('   3. "📅 Taqvim" tugmasi ko\'rinishi kerak');
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Full error:", error);
  }

  process.exit(0);
}

setMenuButton();
