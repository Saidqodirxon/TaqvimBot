require("dotenv").config();
const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);

// Admin user ID
const ADMIN_USER_ID = parseInt(process.env.ADMIN_ID) || 1551855614;
const MINI_APP_URL =
  process.env.MINI_APP_URL || "https://ramazonbot.saidqodirxon.uz";

async function setMenuButton() {
  try {
    console.log("🔧 Setting menu button...");
    console.log("Admin ID:", ADMIN_USER_ID);
    console.log("Mini App URL:", MINI_APP_URL);
    console.log("");

    // 1. Set default menu button for all users
    console.log("1️⃣ Setting default menu button for ALL users...");
    await bot.telegram.setChatMenuButton({
      menu_button: {
        type: "web_app",
        text: "📅 Taqvim",
        web_app: {
          url: MINI_APP_URL,
        },
      },
    });
    console.log("✅ Default menu button set!");

    // 2. Set for admin user specifically
    console.log("\n2️⃣ Setting menu button for admin user...");
    await bot.telegram.setChatMenuButton({
      chat_id: ADMIN_USER_ID,
      menu_button: {
        type: "web_app",
        text: "📅 Taqvim",
        web_app: {
          url: MINI_APP_URL,
        },
      },
    });
    console.log(`✅ Menu button set for admin: ${ADMIN_USER_ID}`);

    // 3. Verify menu button
    console.log("\n3️⃣ Verifying menu button...");
    const menuButton = await bot.telegram.getChatMenuButton({
      chat_id: ADMIN_USER_ID,
    });
    console.log("Current menu button:", JSON.stringify(menuButton, null, 2));

    console.log("\n✅ ALL DONE!");
    console.log("\n📱 Endi Telegram botingizga boring:");
    console.log("   1. Botga /start yuboring");
    console.log("   2. Keyboard yonidagi ≡ (menu) tugmasini bosing");
    console.log("   3. '📅 Taqvim' tugmasi ko'rinishi kerak");
    console.log("   4. Bosganingizda WebApp ochilishi kerak");
  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    if (error.response) {
      console.error("Response:", error.response);
    }
    console.error("\nFull error:", error);
  } finally {
    process.exit(0);
  }

  process.exit(0);
}

setMenuButton();
