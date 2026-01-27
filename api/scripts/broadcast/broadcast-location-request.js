const { Telegraf, Markup } = require("telegraf");
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

const bot = new Telegraf(process.env.BOT_TOKEN);

async function sendLocationRequestToAll() {
  try {
    console.log("\n" + "=".repeat(70));
    console.log("📍 SENDING LOCATION REQUEST TO ALL USERS");
    console.log("=".repeat(70) + "\n");

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected\n");

    // Get users without location (imported from us.json)
    const usersWithoutLocation = await User.find({
      $or: [
        { "location.latitude": { $exists: false } },
        { "location.latitude": null },
      ],
    })
      .select("userId firstName language")
      .lean();

    console.log(
      `📊 Found ${usersWithoutLocation.length} users without location\n`
    );

    if (usersWithoutLocation.length === 0) {
      console.log("✅ All users have location set!");
      process.exit(0);
    }

    const messages = {
      uz: `🕌 <b>Muhim xabar!</b>

Botimiz yangilandi va endi 232 ta O'zbekiston shahri uchun namoz vaqtlari mavjud!

⚠️ <b>Joylashuvingizni tanlang</b>
Namoz vaqtlarini olish uchun shaharingizni tanlashingiz kerak.

👇 Quyidagi tugmalardan birini bosing:`,

      ru: `🕌 <b>Важное сообщение!</b>

Наш бот обновлен и теперь доступно время намаза для 232 городов Узбекистана!

⚠️ <b>Выберите ваше местоположение</b>
Для получения времени намаза нужно выбрать ваш город.

👇 Нажмите одну из кнопок:`,

      cr: `🕌 <b>Муҳим хабар!</b>

Ботимиз янгиланди ва энди 232 та Ўзбекистон шаҳри учун намоз вақтлари мавжуд!

⚠️ <b>Жойлашувингизни танланг</b>
Намоз вақтларини олиш учун шаҳарингизни танлашингиз керак.

👇 Қуйидаги тугмалардан бирини босинг:`,
    };

    let sent = 0;
    let failed = 0;
    let blocked = 0;

    console.log("📤 Starting broadcast...\n");

    for (const user of usersWithoutLocation) {
      try {
        const lang = user.language || "uz";
        const message = messages[lang] || messages.uz;

        await bot.telegram.sendMessage(user.userId, message, {
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

        sent++;

        if (sent % 100 === 0) {
          console.log(`   ✅ Sent: ${sent}/${usersWithoutLocation.length}`);
          // Delay to avoid hitting rate limits
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          // Small delay between messages
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      } catch (error) {
        failed++;

        if (
          error.response?.error_code === 403 ||
          error.message.includes("bot was blocked")
        ) {
          blocked++;
          // Mark user as inactive
          await User.updateOne({ userId: user.userId }, { isActive: false });
        }

        if (failed < 10) {
          console.log(`   ❌ Failed for user ${user.userId}: ${error.message}`);
        }
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("✅ BROADCAST COMPLETED");
    console.log("=".repeat(70));
    console.log(`✅ Successfully sent: ${sent}`);
    console.log(`🚫 Blocked/deleted: ${blocked}`);
    console.log(`❌ Other errors: ${failed - blocked}`);
    console.log("=".repeat(70) + "\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

sendLocationRequestToAll();
