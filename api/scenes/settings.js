const { Scenes, Markup } = require("telegraf");
const { t } = require("../utils/translator");
const User = require("../models/User");

const settingsScene = new Scenes.BaseScene("settings");

// Enter scene
settingsScene.enter(async (ctx) => {
  const lang = ctx.session.language;
  const user = await User.findOne({ userId: ctx.from.id });

  const text = await t(lang, "settings_menu");
  const keyboard = Markup.keyboard([
    [
      await t(lang, "btn_prayer_reminders"),
      await t(lang, "btn_prayer_settings"),
    ],
    [await t(lang, "btn_location"), await t(lang, "btn_change_language")],
    [await t(lang, "btn_back_main")],
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

    const buttons = [];
    for (const prayerKey of prayers) {
      const isEnabled = user.reminderSettings.prayers[prayerKey];
      const icon = isEnabled ? "✅" : "❌";
      buttons.push([
        Markup.button.callback(
          `${icon} ${await t(lang, prayerKey)}`,
          `toggle_prayer_${prayerKey}`
        ),
      ]);
    }

    // Eslatma vaqti
    const minuteButtons = [];
    for (const min of [5, 10, 15, 30]) {
      const isCurrent = user.reminderSettings.minutesBefore === min;
      minuteButtons.push(
        Markup.button.callback(
          `${isCurrent ? "✅" : ""} ${min} ${await t(lang, "minutes_before")}`,
          `set_minutes_${min}`
        )
      );
    }

    buttons.push([
      Markup.button.callback(await t(lang, "btn_back"), "settings_back"),
    ]);

    // Check if all reminders are enabled
    const allEnabled = prayers.every((p) => user.reminderSettings.prayers[p]);
    const toggleAllButton = allEnabled
      ? Markup.button.callback(
          await t(lang, "btn_disable_all_reminders"),
          "disable_all_reminders"
        )
      : Markup.button.callback(
          await t(lang, "btn_enable_all_reminders"),
          "enable_all_reminders"
        );

    const text = await t(lang, "configure_reminders");
    await ctx.reply(
      text +
        `\n\n⏱ ${await t(lang, "current_reminder_time")}: ${
          user.reminderSettings.minutesBefore
        } ${await t(lang, "minutes")}`,
      Markup.inlineKeyboard([...buttons, minuteButtons, [toggleAllButton]])
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

  // Auto-enable/disable global flag based on any prayer being enabled
  const prayers = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  const anyEnabled = prayers.some((p) => user.reminderSettings.prayers[p]);
  user.reminderSettings.enabled = anyEnabled;

  await user.save();

  // Schedule/cancel reminders
  if (anyEnabled && global.reminderBot) {
    const { schedulePrayerReminders } = require("../utils/prayerReminders");
    await schedulePrayerReminders(global.reminderBot, user);
  } else {
    const { cancelUserReminders } = require("../utils/prayerReminders");
    cancelUserReminders(ctx.from.id);
  }

  await ctx.answerCbQuery(await t(lang, "saved"));

  // Refresh buttons (reuse prayers array)
  const buttons = [];
  for (const pKey of prayers) {
    const isEnabled = user.reminderSettings.prayers[pKey];
    const icon = isEnabled ? "✅" : "❌";
    buttons.push([
      Markup.button.callback(
        `${icon} ${await t(lang, pKey)}`,
        `toggle_prayer_${pKey}`
      ),
    ]);
  }

  const minuteButtons = [];
  for (const min of [5, 10, 15, 30]) {
    const isCurrent = user.reminderSettings.minutesBefore === min;
    minuteButtons.push(
      Markup.button.callback(
        `${isCurrent ? "✅" : ""} ${min} ${await t(lang, "minutes_before")}`,
        `set_minutes_${min}`
      )
    );
  }

  buttons.push([
    Markup.button.callback(await t(lang, "btn_back"), "settings_back"),
  ]);

  // Check if all reminders are enabled
  const allEnabled = prayers.every((p) => user.reminderSettings.prayers[p]);
  const toggleAllButton = allEnabled
    ? Markup.button.callback(
        await t(lang, "btn_disable_all_reminders"),
        "disable_all_reminders"
      )
    : Markup.button.callback(
        await t(lang, "btn_enable_all_reminders"),
        "enable_all_reminders"
      );

  await ctx.editMessageText(
    (await t(lang, "configure_reminders")) +
      `\n\n⏱ ${await t(lang, "current_reminder_time")}: ${
        user.reminderSettings.minutesBefore
      } ${await t(lang, "minutes")}`,
    Markup.inlineKeyboard([...buttons, minuteButtons, [toggleAllButton]])
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
    `${await t(lang, "reminder_set_to")} ${minutes} ${await t(lang, "minutes")}`
  );

  // Refresh buttons
  const prayers = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

  const buttons = [];
  for (const pKey of prayers) {
    const isEnabled = user.reminderSettings.prayers[pKey];
    const icon = isEnabled ? "✅" : "❌";
    buttons.push([
      Markup.button.callback(
        `${icon} ${await t(lang, pKey)}`,
        `toggle_prayer_${pKey}`
      ),
    ]);
  }

  const minuteButtons = [];
  for (const min of [5, 10, 15, 30]) {
    const isCurrent = user.reminderSettings.minutesBefore === min;
    minuteButtons.push(
      Markup.button.callback(
        `${isCurrent ? "✅" : ""} ${min} ${await t(lang, "minutes_before")}`,
        `set_minutes_${min}`
      )
    );
  }

  buttons.push([
    Markup.button.callback(await t(lang, "btn_back"), "settings_back"),
  ]);

  // Check if all reminders are enabled
  const allEnabled = prayers.every((p) => user.reminderSettings.prayers[p]);
  const toggleAllButton = allEnabled
    ? Markup.button.callback(
        await t(lang, "btn_disable_all_reminders"),
        "disable_all_reminders"
      )
    : Markup.button.callback(
        await t(lang, "btn_enable_all_reminders"),
        "enable_all_reminders"
      );

  await ctx.editMessageText(
    (await t(lang, "configure_reminders")) +
      `\n\n⏱ ${await t(lang, "current_reminder_time")}: ${minutes} ${await t(
        lang,
        "minutes"
      )}`,
    Markup.inlineKeyboard([...buttons, minuteButtons, [toggleAllButton]])
  );
});

// Back to settings
settingsScene.action("settings_back", async (ctx) => {
  const lang = ctx.session.language;
  await ctx.deleteMessage();
  await ctx.scene.reenter();
});

// Disable all reminders
settingsScene.action("disable_all_reminders", async (ctx) => {
  const lang = ctx.session.language;
  const user = await User.findOne({ userId: ctx.from.id });

  // Disable all prayers AND global enabled flag
  const prayers = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  prayers.forEach((prayer) => {
    user.reminderSettings.prayers[prayer] = false;
  });
  user.reminderSettings.enabled = false; // Also disable global flag
  await user.save();

  await ctx.answerCbQuery(await t(lang, "all_reminders_disabled"));

  // Update reminders (cancel all scheduled jobs)
  const { cancelUserReminders } = require("../utils/prayerReminders");
  cancelUserReminders(ctx.from.id);

  // Refresh the menu
  const buttons = [];
  for (const prayerKey of prayers) {
    const isEnabled = user.reminderSettings.prayers[prayerKey];
    const icon = isEnabled ? "✅" : "❌";
    buttons.push([
      Markup.button.callback(
        `${icon} ${await t(lang, prayerKey)}`,
        `toggle_prayer_${prayerKey}`
      ),
    ]);
  }

  const minuteButtons = [];
  for (const min of [5, 10, 15, 30]) {
    const isCurrent = user.reminderSettings.minutesBefore === min;
    minuteButtons.push(
      Markup.button.callback(
        `${isCurrent ? "✅" : ""} ${min} ${await t(lang, "minutes_before")}`,
        `set_minutes_${min}`
      )
    );
  }

  buttons.push([
    Markup.button.callback(await t(lang, "btn_back"), "settings_back"),
  ]);

  const toggleAllButton = Markup.button.callback(
    await t(lang, "btn_enable_all_reminders"),
    "enable_all_reminders"
  );

  await ctx.editMessageText(
    (await t(lang, "configure_reminders")) +
      `\n\n⏱ ${await t(lang, "current_reminder_time")}: ${
        user.reminderSettings.minutesBefore
      } ${await t(lang, "minutes")}`,
    Markup.inlineKeyboard([...buttons, minuteButtons, [toggleAllButton]])
  );
});

// Enable all reminders
settingsScene.action("enable_all_reminders", async (ctx) => {
  const lang = ctx.session.language;
  const user = await User.findOne({ userId: ctx.from.id });

  // Enable all prayers AND global enabled flag
  const prayers = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  prayers.forEach((prayer) => {
    user.reminderSettings.prayers[prayer] = true;
  });
  user.reminderSettings.enabled = true; // Also enable global flag
  await user.save();

  await ctx.answerCbQuery(await t(lang, "all_reminders_enabled"));

  // Update reminders (schedule jobs)
  const { schedulePrayerReminders } = require("../utils/prayerReminders");
  if (global.reminderBot) {
    await schedulePrayerReminders(global.reminderBot, user);
  }

  // Refresh the menu
  const buttons = [];
  for (const prayerKey of prayers) {
    const isEnabled = user.reminderSettings.prayers[prayerKey];
    const icon = isEnabled ? "✅" : "❌";
    buttons.push([
      Markup.button.callback(
        `${icon} ${await t(lang, prayerKey)}`,
        `toggle_prayer_${prayerKey}`
      ),
    ]);
  }

  const minuteButtons = [];
  for (const min of [5, 10, 15, 30]) {
    const isCurrent = user.reminderSettings.minutesBefore === min;
    minuteButtons.push(
      Markup.button.callback(
        `${isCurrent ? "✅" : ""} ${min} ${await t(lang, "minutes_before")}`,
        `set_minutes_${min}`
      )
    );
  }

  buttons.push([
    Markup.button.callback(await t(lang, "btn_back"), "settings_back"),
  ]);

  const toggleAllButton = Markup.button.callback(
    await t(lang, "btn_disable_all_reminders"),
    "disable_all_reminders"
  );

  await ctx.editMessageText(
    (await t(lang, "configure_reminders")) +
      `\n\n⏱ ${await t(lang, "current_reminder_time")}: ${
        user.reminderSettings.minutesBefore
      } ${await t(lang, "minutes")}`,
    Markup.inlineKeyboard([...buttons, minuteButtons, [toggleAllButton]])
  );
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
      [await t(ctx.session.language, "btn_back")],
    ]).resize();

    await ctx.reply(await t(ctx.session.language, "choose_language"), keyboard);
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
    await t(ctx.session.language, "main_menu"),
    await getMainMenuKeyboard(ctx.session.language)
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
      (await t(lang, "prayer_settings_title")) +
      `\n\n📐 ${await t(lang, "calculation_method")}: ${methodName}` +
      `\n📖 ${await t(lang, "madhab")}: ${schoolName}`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          await t(lang, "btn_select_method"),
          "select_calc_method"
        ),
      ],
      [
        Markup.button.callback(
          await t(lang, "btn_select_madhab"),
          "select_madhab"
        ),
      ],
      [Markup.button.callback(await t(lang, "btn_back"), "settings_back")],
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
    Markup.button.callback(await t(lang, "btn_back"), "back_prayer_settings"),
  ]);

  await ctx.editMessageText(
    await t(lang, "select_calculation_method"),
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

    await ctx.answerCbQuery(await t(lang, "saved"));

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
      (await t(lang, "prayer_settings_title")) +
      `\n\n📐 ${await t(lang, "calculation_method")}: ${methodName}` +
      `\n📖 ${await t(lang, "madhab")}: ${schoolName}`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          await t(lang, "btn_select_method"),
          "select_calc_method"
        ),
      ],
      [
        Markup.button.callback(
          await t(lang, "btn_select_madhab"),
          "select_madhab"
        ),
      ],
      [Markup.button.callback(await t(lang, "btn_back"), "back_settings")],
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
    Markup.button.callback(await t(lang, "btn_back"), "back_prayer_settings"),
  ]);

  await ctx.editMessageText(
    await t(lang, "select_madhab"),
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

    await ctx.answerCbQuery(await t(lang, "saved"));

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
      (await t(lang, "prayer_settings_title")) +
      `\n\n📐 ${await t(lang, "calculation_method")}: ${methodName}` +
      `\n📖 ${await t(lang, "madhab")}: ${schoolName}`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          await t(lang, "btn_select_method"),
          "select_calc_method"
        ),
      ],
      [
        Markup.button.callback(
          await t(lang, "btn_select_madhab"),
          "select_madhab"
        ),
      ],
      [Markup.button.callback(await t(lang, "btn_back"), "back_settings")],
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
    (await t(lang, "prayer_settings_title")) +
    `\n\n📐 ${await t(lang, "calculation_method")}: ${methodName}` +
    `\n📖 ${await t(lang, "madhab")}: ${schoolName}`;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback(
        await t(lang, "btn_select_method"),
        "select_calc_method"
      ),
    ],
    [
      Markup.button.callback(
        await t(lang, "btn_select_madhab"),
        "select_madhab"
      ),
    ],
    [Markup.button.callback(await t(lang, "btn_back"), "settings_back")],
  ]);

  await ctx.reply(text, keyboard);
});

// Back to settings menu from prayer settings
settingsScene.action("back_settings", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.deleteMessage();
  await ctx.scene.reenter();
});

module.exports = settingsScene;
