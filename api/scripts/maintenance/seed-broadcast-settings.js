const mongoose = require("mongoose");
require("dotenv").config();
const Settings = require("./models/Settings");

async function seedBroadcastSettings() {
  try {
    console.log("🌱 Seeding broadcast settings...\n");

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected\n");

    const settings = [
      {
        key: "broadcast_location_message_uz",
        value: `🕌 <b>Muhim xabar!</b>

Botimiz yangilandi va endi 232 ta O'zbekiston shahri uchun namoz vaqtlari mavjud!

⚠️ <b>Joylashuvingizni tanlang</b>
Namoz vaqtlarini olish uchun shaharingizni tanlashingiz kerak.

👇 Quyidagi tugmani bosing:`,
        description: "Location request broadcast message (Uzbek Latin)",
      },
      {
        key: "broadcast_location_message_ru",
        value: `🕌 <b>Важное сообщение!</b>

Наш бот обновлен и теперь доступно время намаза для 232 городов Узбекистана!

⚠️ <b>Выберите ваше местоположение</b>
Для получения времени намаза нужно выбрать ваш город.

👇 Нажмите кнопку:`,
        description: "Location request broadcast message (Russian)",
      },
      {
        key: "broadcast_location_message_cr",
        value: `🕌 <b>Муҳим хабар!</b>

Ботимиз янгиланди ва энди 232 та Ўзбекистон шаҳри учун намоз вақтлари мавжуд!

⚠️ <b>Жойлашувингизни танланг</b>
Намоз вақтларини олиш учун шаҳарингизни танлашингиз керак.

👇 Қуйидаги тугмани босинг:`,
        description: "Location request broadcast message (Uzbek Cyrillic)",
      },
      {
        key: "broadcast_restart_button_text",
        value: "🔄 Botni qayta ishga tushirish",
        description: "Restart bot button text (shown separately)",
      },
      {
        key: "broadcast_reminder_button_text_uz",
        value: "🔔 Eslatmalarni yoqish",
        description: "Enable reminders button text (Uzbek)",
      },
      {
        key: "broadcast_reminder_button_text_ru",
        value: "🔔 Включить напоминания",
        description: "Enable reminders button text (Russian)",
      },
      {
        key: "broadcast_reminder_button_text_cr",
        value: "🔔 Эслатмаларни ёқиш",
        description: "Enable reminders button text (Cyrillic)",
      },
      {
        key: "broadcast_show_location_button",
        value: true,
        description: "Show location selection button in broadcast",
      },
      {
        key: "broadcast_show_reminder_button",
        value: true,
        description: "Show reminder enable button in broadcast",
      },
      {
        key: "broadcast_show_restart_button",
        value: true,
        description: "Show restart bot button in broadcast",
      },
    ];

    for (const setting of settings) {
      await Settings.setSetting(setting.key, setting.value);
      console.log(`✅ ${setting.key}`);
      console.log(`   ${setting.description}\n`);
    }

    console.log("✅ All broadcast settings created!\n");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

seedBroadcastSettings();
