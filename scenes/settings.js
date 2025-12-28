const { Scenes, Markup } = require("telegraf");
const { t } = require("../utils/translator");
const User = require("../models/User");

const settingsScene = new Scenes.BaseScene("settings");

// Enter scene
settingsScene.enter(async (ctx) => {
  const lang = ctx.session.language;
  const user = await User.findOne({ userId: ctx.from.id });

  const text = t(lang, "settings_menu");
  const keyboard = Markup.keyboard([
    [t(lang, "btn_prayer_reminders"), t(lang, "btn_prayer_settings")],
    [t(lang, "btn_location"), t(lang, "btn_change_language")],
    [t(lang, "btn_back_main")],
  ]).resize();

  await ctx.reply(text, keyboard);
});

// Prayer reminders
settingsScene.hears(
  [/⏰.*/, "⏰ Namoz eslatmalari", "⏰ Напоминания о намазе"],
  async (ctx) => {
    const lang = ctx.session.language;
    const user = await User.findOne({ userId: ctx.from.id });

    const prayers = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

    const buttons = prayers.map((prayerKey) => {
      const isEnabled = user.reminderSettings.prayers[prayerKey];
      const icon = isEnabled ? "✅" : "❌";
      return [
        Markup.button.callback(
          `${icon} ${t(lang, prayerKey)}`,
          `toggle_prayer_${prayerKey}`
        ),
      ];
    });

    // Eslatma vaqti
    const minuteButtons = [5, 10, 15, 30].map((min) => {
      const isCurrent = user.reminderSettings.minutesBefore === min;
      return Markup.button.callback(
        `${isCurrent ? "✅" : ""} ${min} ${t(lang, "minutes_before")}`,
        `set_minutes_${min}`
      );
    });

    buttons.push([
      Markup.button.callback(t(lang, "btn_back"), "settings_back"),
    ]);

    const text = t(lang, "configure_reminders");
    await ctx.reply(
      text +
        `\n\n⏱ ${t(lang, "current_reminder_time")}: ${
          user.reminderSettings.minutesBefore
        } ${t(lang, "minutes")}`,
      Markup.inlineKeyboard([...buttons, minuteButtons])
    );
  }
);

// Toggle prayer reminder
settingsScene.action(/toggle_prayer_(.+)/, async (ctx) => {
  const prayerKey = ctx.match[1];
  const user = await User.findOne({ userId: ctx.from.id });
  const lang = ctx.session.language;

  user.reminderSettings.prayers[prayerKey] =
    !user.reminderSettings.prayers[prayerKey];
  await user.save();

  await ctx.answerCbQuery(t(lang, "saved"));

  // Refresh buttons
  const prayers = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

  const buttons = prayers.map((pKey) => {
    const isEnabled = user.reminderSettings.prayers[pKey];
    const icon = isEnabled ? "✅" : "❌";
    return [
      Markup.button.callback(
        `${icon} ${t(lang, pKey)}`,
        `toggle_prayer_${pKey}`
      ),
    ];
  });

  const minuteButtons = [5, 10, 15, 30].map((min) => {
    const isCurrent = user.reminderSettings.minutesBefore === min;
    return Markup.button.callback(
      `${isCurrent ? "✅" : ""} ${min} ${t(lang, "minutes_before")}`,
      `set_minutes_${min}`
    );
  });

  buttons.push([Markup.button.callback(t(lang, "btn_back"), "settings_back")]);

  await ctx.editMessageText(
    t(lang, "configure_reminders") +
      `\n\n⏱ ${t(lang, "current_reminder_time")}: ${
        user.reminderSettings.minutesBefore
      } ${t(lang, "minutes")}`,
    Markup.inlineKeyboard([...buttons, minuteButtons])
  );
});

// Set minutes before
settingsScene.action(/set_minutes_(\d+)/, async (ctx) => {
  const minutes = parseInt(ctx.match[1]);
  const user = await User.findOne({ userId: ctx.from.id });
  const lang = ctx.session.language;

  user.reminderSettings.minutesBefore = minutes;
  await user.save();

  await ctx.answerCbQuery(
    `${t(lang, "reminder_set_to")} ${minutes} ${t(lang, "minutes")}`
  );

  // Refresh buttons
  const prayers = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

  const buttons = prayers.map((pKey) => {
    const isEnabled = user.reminderSettings.prayers[pKey];
    const icon = isEnabled ? "✅" : "❌";
    return [
      Markup.button.callback(
        `${icon} ${t(lang, pKey)}`,
        `toggle_prayer_${pKey}`
      ),
    ];
  });

  const minuteButtons = [5, 10, 15, 30].map((min) => {
    const isCurrent = user.reminderSettings.minutesBefore === min;
    return Markup.button.callback(
      `${isCurrent ? "✅" : ""} ${min} ${t(lang, "minutes_before")}`,
      `set_minutes_${min}`
    );
  });

  buttons.push([Markup.button.callback(t(lang, "btn_back"), "settings_back")]);

  await ctx.editMessageText(
    t(lang, "configure_reminders") +
      `\n\n⏱ ${t(lang, "current_reminder_time")}: ${minutes} ${t(
        lang,
        "minutes"
      )}`,
    Markup.inlineKeyboard([...buttons, minuteButtons])
  );
});

// Back to settings
settingsScene.action("settings_back", async (ctx) => {
  const lang = ctx.session.language;
  await ctx.deleteMessage();
  await ctx.scene.reenter();
});

// Change location
settingsScene.hears(
  [/📍.*/, "📍 Joylashuv", "📍 Местоположение"],
  async (ctx) => {
    await ctx.scene.enter("location");
  }
);

// Change language
settingsScene.hears(
  [/🌐.*/, "🌐 Tilni o'zgartirish", "🌐 Изменить язык"],
  async (ctx) => {
    const keyboard = Markup.keyboard([
      ["🇺🇿 O'zbekcha", "🇷🇺 Кириллча"],
      ["🇷🇺 Русский"],
      [t(ctx.session.language, "btn_back")],
    ]).resize();

    await ctx.reply(t(ctx.session.language, "choose_language"), keyboard);
  }
);

// Handle language change
settingsScene.hears(["🇺🇿 O'zbekcha"], async (ctx) => {
  await User.findOneAndUpdate(
    { userId: ctx.from.id },
    { language: "uz" },
    { new: true }
  );
  ctx.session.language = "uz";
  await ctx.reply("✅ Til o'zgartirildi!");
  await ctx.scene.reenter();
});

settingsScene.hears(["🇷🇺 Кириллча"], async (ctx) => {
  await User.findOneAndUpdate(
    { userId: ctx.from.id },
    { language: "cr" },
    { new: true }
  );
  ctx.session.language = "cr";
  await ctx.reply("✅ Тил ўзгартирилди!");
  await ctx.scene.reenter();
});

settingsScene.hears(["🇷🇺 Русский"], async (ctx) => {
  await User.findOneAndUpdate(
    { userId: ctx.from.id },
    { language: "ru" },
    { new: true }
  );
  ctx.session.language = "ru";
  await ctx.reply("✅ Язык изменён!");
  await ctx.scene.reenter();
});

// Back to main menu
settingsScene.hears([/🔙.*/, "🔙 Orqaga", "🔙 Назад"], async (ctx) => {
  await ctx.scene.leave();
  const { getMainMenuKeyboard } = require("../utils/keyboards");
  await ctx.reply(
    t(ctx.session.language, "main_menu"),
    getMainMenuKeyboard(ctx.session.language)
  );
});

// Prayer settings
settingsScene.hears(
  [/⚙️ Namoz sozlamalari/, /⚙️ Намоз созламалари/, /⚙️ Настройки намаза/],
  async (ctx) => {
    const lang = ctx.session.language || "uz"; // Default to Uzbek
    const user = await User.findOne({ userId: ctx.from.id });

    const { CALCULATION_METHODS, SCHOOLS } = require("../utils/aladhan");

    const currentMethod = user.prayerSettings?.calculationMethod || 3;
    const currentSchool = user.prayerSettings?.school || 1;

    console.log(
      `🔍 Debug prayer_settings: userId=${ctx.from.id}, method=${currentMethod}, lang=${lang}`
    );
    console.log(
      `🔍 CALCULATION_METHODS[${currentMethod}]:`,
      CALCULATION_METHODS[currentMethod]
    );
    console.log(
      `🔍 methodName result:`,
      CALCULATION_METHODS[currentMethod]?.[lang]
    );

    const methodName =
      CALCULATION_METHODS[currentMethod]?.[lang] ||
      CALCULATION_METHODS[3]?.uz ||
      "Musulmonlar dunyosi ligasi";
    const schoolName =
      SCHOOLS[currentSchool]?.[lang] || SCHOOLS[1]?.uz || "Hanafiy";

    const text =
      t(lang, "prayer_settings_title") +
      `\n\n📐 ${t(lang, "calculation_method")}: ${methodName}` +
      `\n📖 ${t(lang, "madhab")}: ${schoolName}`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          t(lang, "btn_select_method"),
          "select_calc_method"
        ),
      ],
      [Markup.button.callback(t(lang, "btn_select_madhab"), "select_madhab")],
      [Markup.button.callback(t(lang, "btn_back"), "settings_back")],
    ]);

    await ctx.reply(text, keyboard);
  }
);

// Select calculation method
settingsScene.action("select_calc_method", async (ctx) => {
  await ctx.answerCbQuery();
  const lang = ctx.session.language || "uz";
  const { CALCULATION_METHODS } = require("../utils/aladhan");

  const buttons = Object.entries(CALCULATION_METHODS).map(([key, names]) => {
    const text = names[lang] || names.uz || names.en || `Method ${key}`;
    return [Markup.button.callback(text, `set_method_${key}`)];
  });

  buttons.push([
    Markup.button.callback(t(lang, "btn_back"), "back_prayer_settings"),
  ]);

  await ctx.editMessageText(
    t(lang, "select_calculation_method"),
    Markup.inlineKeyboard(buttons)
  );
});

// Set calculation method
settingsScene.action(/set_method_(\d+)/, async (ctx) => {
  try {
    const method = parseInt(ctx.match[1]);
    const lang = ctx.session.language || "uz";

    console.log(`🔄 User ${ctx.from.id} changing method to: ${method}`);

    // Update user settings and get updated user
    const user = await User.findOneAndUpdate(
      { userId: ctx.from.id },
      { "prayerSettings.calculationMethod": method },
      { new: true }
    );

    console.log(
      `✅ User updated, new method: ${user?.prayerSettings?.calculationMethod}`
    );

    // Update session with fresh user data
    if (user) {
      ctx.session.user = user;
    }

    await ctx.answerCbQuery(t(lang, "saved"));

    // Update reminders with new method
    const { updateUserReminders } = require("../utils/prayerReminders");
    if (user) {
      await updateUserReminders(
        ctx.telegram,
        ctx.from.id,
        user.reminderSettings
      );
    }

    // Go back to prayer settings menu with updated data
    await ctx.deleteMessage();

    const { CALCULATION_METHODS, SCHOOLS } = require("../utils/aladhan");
    // Use fresh user data
    const currentMethod = user?.prayerSettings?.calculationMethod || 3;
    const currentSchool = user?.prayerSettings?.school || 1;

    const methodName =
      CALCULATION_METHODS[currentMethod]?.[lang] ||
      CALCULATION_METHODS[3]?.uz ||
      "Musulmonlar dunyosi ligasi";
    const schoolName =
      SCHOOLS[currentSchool]?.[lang] || SCHOOLS[1]?.uz || "Hanafiy";

    const text =
      t(lang, "prayer_settings_title") +
      `\n\n📐 ${t(lang, "calculation_method")}: ${methodName}` +
      `\n📖 ${t(lang, "madhab")}: ${schoolName}`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          t(lang, "btn_select_method"),
          "select_calc_method"
        ),
      ],
      [Markup.button.callback(t(lang, "btn_select_madhab"), "select_madhab")],
      [Markup.button.callback(t(lang, "btn_back"), "back_settings")],
    ]);

    await ctx.reply(text, keyboard);
  } catch (error) {
    console.error("❌ Error setting calculation method:", error);
    await ctx.answerCbQuery("Xatolik yuz berdi");
  }
});

// Select madhab
settingsScene.action("select_madhab", async (ctx) => {
  await ctx.answerCbQuery();
  const lang = ctx.session.language || "uz";
  const { SCHOOLS } = require("../utils/aladhan");

  const buttons = Object.entries(SCHOOLS).map(([key, names]) => {
    const text = names[lang] || names.uz || names.en || `School ${key}`;
    return [Markup.button.callback(text, `set_madhab_${key}`)];
  });

  buttons.push([
    Markup.button.callback(t(lang, "btn_back"), "back_prayer_settings"),
  ]);

  await ctx.editMessageText(
    t(lang, "select_madhab"),
    Markup.inlineKeyboard(buttons)
  );
});

// Set madhab
settingsScene.action(/set_madhab_(\d+)/, async (ctx) => {
  try {
    const school = parseInt(ctx.match[1]);
    const lang = ctx.session.language || "uz";

    // Update user settings and get updated user
    const user = await User.findOneAndUpdate(
      { userId: ctx.from.id },
      { "prayerSettings.school": school },
      { new: true }
    );

    // Update session with fresh user data
    if (user) {
      ctx.session.user = user;
    }

    await ctx.answerCbQuery(t(lang, "saved"));

    // Update reminders with new school
    const { updateUserReminders } = require("../utils/prayerReminders");
    if (user) {
      await updateUserReminders(
        ctx.telegram,
        ctx.from.id,
        user.reminderSettings
      );
    }

    // Go back to prayer settings menu with updated data
    await ctx.deleteMessage();

    const { CALCULATION_METHODS, SCHOOLS } = require("../utils/aladhan");
    // Use fresh user data
    const currentMethod = user?.prayerSettings?.calculationMethod || 3;
    const currentSchool = user?.prayerSettings?.school || 1;

    const methodName =
      CALCULATION_METHODS[currentMethod]?.[lang] ||
      CALCULATION_METHODS[3]?.uz ||
      "Musulmonlar dunyosi ligasi";
    const schoolName =
      SCHOOLS[currentSchool]?.[lang] || SCHOOLS[1]?.uz || "Hanafiy";

    const text =
      t(lang, "prayer_settings_title") +
      `\n\n📐 ${t(lang, "calculation_method")}: ${methodName}` +
      `\n📖 ${t(lang, "madhab")}: ${schoolName}`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          t(lang, "btn_select_method"),
          "select_calc_method"
        ),
      ],
      [Markup.button.callback(t(lang, "btn_select_madhab"), "select_madhab")],
      [Markup.button.callback(t(lang, "btn_back"), "back_settings")],
    ]);

    await ctx.reply(text, keyboard);
  } catch (error) {
    console.error("❌ Error setting madhab:", error);
    await ctx.answerCbQuery("Xatolik yuz berdi");
  }
});

// Back to prayer settings
settingsScene.action("back_prayer_settings", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.deleteMessage();

  const lang = ctx.session.language || "uz";
  const user = await User.findOne({ userId: ctx.from.id });
  const { CALCULATION_METHODS, SCHOOLS } = require("../utils/aladhan");

  const currentMethod = user.prayerSettings?.calculationMethod || 3;
  const currentSchool = user.prayerSettings?.school || 1;

  const methodName =
    CALCULATION_METHODS[currentMethod]?.[lang] ||
    CALCULATION_METHODS[3]?.uz ||
    "Musulmonlar dunyosi ligasi";
  const schoolName =
    SCHOOLS[currentSchool]?.[lang] || SCHOOLS[1]?.uz || "Hanafiy";

  const text =
    t(lang, "prayer_settings_title") +
    `\n\n📐 ${t(lang, "calculation_method")}: ${methodName}` +
    `\n📖 ${t(lang, "madhab")}: ${schoolName}`;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback(
        t(lang, "btn_select_method"),
        "select_calc_method"
      ),
    ],
    [Markup.button.callback(t(lang, "btn_select_madhab"), "select_madhab")],
    [Markup.button.callback(t(lang, "btn_back"), "settings_back")],
  ]);

  await ctx.reply(text, keyboard);
});

module.exports = settingsScene;
