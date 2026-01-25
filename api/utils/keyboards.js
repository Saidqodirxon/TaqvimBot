const { Markup } = require("telegraf");
const { t } = require("./translator");

/**
 * Create language selection keyboard
 */
function getLanguageKeyboard(showBack = false) {
  const buttons = [
    [
      Markup.button.callback("🇺🇿 O'zbek", "lang_uz"),
      Markup.button.callback("🇺🇿 Ўзбек", "lang_cr"),
    ],
    [Markup.button.callback("🇷🇺 Русский", "lang_ru")],
  ];

  if (showBack) {
    buttons.push([Markup.button.callback("◀️ Orqaga", "back_to_settings")]);
  }

  return Markup.inlineKeyboard(buttons);
}

/**
 * Create main menu keyboard based on user language
 */
function getMainMenuKeyboard(lang = "uz") {
  const webAppUrl = process.env.MINI_APP_URL;
  const buttons = [];

  // Only show WebApp button if HTTPS URL is configured
  if (webAppUrl && webAppUrl.startsWith("https://")) {
    buttons.push([
      Markup.button.webApp(t(lang, "btn_calendar_webapp"), webAppUrl),
      t(lang, "btn_send_greeting"),
    ]);
  } else {
    buttons.push([t(lang, "btn_calendar"), t(lang, "btn_send_greeting")]);
  }

  buttons.push(
    [t(lang, "btn_prayers"), t(lang, "btn_ramadan_countdown")],
    [t(lang, "btn_settings"), t(lang, "btn_suggest")],
    [t(lang, "btn_about")]
  );

  return Markup.keyboard(buttons).resize().persistent(true);
}

/**
 * Create inline settings keyboard (moved to inline for cleaner interface)
 */
function getSettingsInlineKeyboard(lang = "uz") {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, "btn_location"), "open_location_settings")],
    [
      Markup.button.callback(
        t(lang, "reminder_settings"),
        "open_reminder_settings"
      ),
    ],
    [Markup.button.callback(t(lang, "btn_back"), "back_to_about")],
  ]);
}

/**
 * Create prayers selection keyboard
 */
function getPrayersKeyboard(lang = "uz") {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("🇺🇿 O'zbek", "prayers_uz"),
      Markup.button.callback("🇺🇿 Ўзбек", "prayers_cr"),
    ],
    [Markup.button.callback("🇷🇺 Русский", "prayers_ru")],
    [Markup.button.callback(t(lang, "btn_back"), "close_prayers")],
  ]);
}

/**
 * Create settings keyboard (deprecated - use getSettingsInlineKeyboard)
 */
function getSettingsKeyboard(lang = "uz") {
  return getSettingsInlineKeyboard(lang);
}

/**
 * Create location selection keyboard
 */
function getLocationKeyboard(lang = "uz") {
  return Markup.keyboard([
    [Markup.button.locationRequest(t(lang, "location_btn_send"))],
    [t(lang, "btn_back")],
  ]).resize();
}

/**
 * Create inline location buttons from cities list
 */
function getLocationInlineKeyboard(cities, lang = "uz") {
  const buttons = [];
  const citiesPerRow = 3;

  for (let i = 0; i < cities.length; i += citiesPerRow) {
    const row = [];
    for (let j = i; j < i + citiesPerRow && j < cities.length; j++) {
      const city = cities[j];
      const cityName =
        city[`name${lang === "cr" ? "Cr" : lang === "ru" ? "Ru" : "Uz"}`];
      row.push(Markup.button.callback(cityName, `location_${city._id}`));
    }
    buttons.push(row);
  }

  return Markup.inlineKeyboard(buttons);
}

/**
 * Create confirmation keyboard
 */
function getConfirmKeyboard(lang = "uz") {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(t(lang, "btn_confirm"), "confirm"),
      Markup.button.callback(t(lang, "btn_reject"), "reject"),
    ],
  ]);
}

/**
 * Create back button
 */
function getBackButton(lang = "uz") {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, "btn_back"), "back_main")],
  ]);
}

/**
 * Create admin main keyboard
 */
function getAdminMainKeyboard() {
  return Markup.keyboard([
    ["📊 Statistika", "👥 Foydalanuvchilar"],
    ["✉️ Xabar yuborish", "💌 Tabriklar"],
    ["⚙️ Sozlamalar", "🔙 Chiqish"],
  ]).resize();
}

/**
 * Create admin greetings keyboard
 */
function getAdminGreetingsKeyboard(greetingId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("✅ Tasdiqlash", `approve_${greetingId}`),
      Markup.button.callback("❌ Rad etish", `reject_${greetingId}`),
    ],
  ]);
}

/**
 * Create refresh button for countdown
 */
function getRefreshKeyboard(lang = "uz") {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(t(lang, "btn_refresh"), "refresh_countdown"),
      Markup.button.callback("🔄", "back_main"),
    ],
  ]);
}

/**
 * Create calendar view selection keyboard (daily/weekly)
 */
function getCalendarViewKeyboard(lang = "uz") {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(t(lang, "btn_daily"), "calendar_daily"),
      Markup.button.callback(t(lang, "btn_weekly"), "calendar_weekly"),
    ],
    [Markup.button.callback(t(lang, "btn_qibla"), "show_qibla")],
    [Markup.button.callback(t(lang, "btn_back"), "back_main")],
  ]);
}

/**
 * Create reminder settings keyboard
 */
function getReminderSettingsKeyboard(lang = "uz", currentSettings) {
  const enabled = currentSettings?.enabled !== false;
  const minutesBefore = currentSettings?.minutesBefore || 15;

  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        enabled ? t(lang, "reminder_enabled") : t(lang, "reminder_disabled"),
        "toggle_reminders"
      ),
    ],
    [
      Markup.button.callback(
        t(lang, "btn_reminder_time", { minutes: minutesBefore }),
        "reminder_time_header"
      ),
    ],
    [
      Markup.button.callback(t(lang, "btn_reminder_5min"), "reminder_time_5"),
      Markup.button.callback(t(lang, "btn_reminder_10min"), "reminder_time_10"),
    ],
    [
      Markup.button.callback(t(lang, "btn_reminder_15min"), "reminder_time_15"),
      Markup.button.callback(t(lang, "btn_reminder_30min"), "reminder_time_30"),
    ],
    [Markup.button.callback(t(lang, "btn_back"), "open_settings")],
  ]);
}

/**
 * Create phone number request keyboard
 */
function getPhoneRequestKeyboard(lang = "uz") {
  return Markup.keyboard([
    [Markup.button.contactRequest(t(lang, "btn_send_phone"))],
    [t(lang, "btn_back")],
  ]).resize();
}

/**
 * Create location settings keyboard
 */
function getLocationSettingsKeyboard(lang = "uz") {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, "btn_change_language"), "change_lang")],
    [Markup.button.callback(t(lang, "btn_location"), "change_location")],
    [Markup.button.callback(t(lang, "btn_back"), "open_settings")],
  ]);
}

module.exports = {
  getLanguageKeyboard,
  getMainMenuKeyboard,
  getSettingsKeyboard,
  getSettingsInlineKeyboard,
  getPrayersKeyboard,
  getLocationKeyboard,
  getLocationInlineKeyboard,
  getConfirmKeyboard,
  getBackButton,
  getAdminMainKeyboard,
  getAdminGreetingsKeyboard,
  getRefreshKeyboard,
  getCalendarViewKeyboard,
  getReminderSettingsKeyboard,
  getPhoneRequestKeyboard,
  getLocationSettingsKeyboard,
};
