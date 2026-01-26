// Translations for 3 languages: Uzbek Latin, Uzbek Cyrillic, Russian
module.exports = {
  uz: {
    // Uzbek Latin
    welcome:
      "Assalomu Alaykum! Ramazon Taqvim botiga xush kelibsiz!\nBotdan foydalanish uchun tilni tanlang 👇",
    choose_language: "🌐 Tilni tanlang:",
    language_set: "✅ Til o'zgartirildi!",
    main_menu: "Asosiy menyu 📋",

    // Buttons
    btn_calendar: "📅 Taqvim",
    btn_calendar_webapp: "📱 Taqvim (WebApp)",
    btn_send_greeting: "💌 Tabrik yuborish",
    btn_about: "ℹ️ Bot haqida",
    btn_suggest: "💡 Taklif yuborish",
    btn_settings: "⚙️ Sozlamalar",
    btn_prayers: "🤲 Duolar",
    btn_location: "📍 Joylashuv",
    btn_ramadan_countdown: "⏰ Ramazonga qancha qoldi?",
    btn_change_language: "🌐 Tilni o'zgartirish",
    btn_back: "◀️ Orqaga",
    btn_back_menu: "◀️ Bosh menyuga qaytish",
    btn_cancel: "❌ Bekor qilish",
    btn_confirm: "✅ Tasdiqlash",
    btn_reject: "❌ Rad etish",

    // Prayers
    prayers_title: "🤲 Duolar",
    prayers_select: "Duoni tanlang:",
    no_prayers: "⚠️ Hozircha duolar mavjud emas.",
    prayer_not_found: "❌ Dua topilmadi.",
    prayers_text:
      "🤲 Namozdan keyingi duolar:\n\nSubh namozidan keyin:\nSubhaanalloohi val hamdulillaahi valaa ilaaha illallohu valloohu akbar. (33 marta)\n\nPeshin, Asr, Shom va Xufton namozidan keyin:\nSubhaanalloohi val hamdulillaahi valaa ilaaha illallohu valloohu akbar. (33 marta)\n\nAyatul Kursi o'qish.\n\n🤲 Qunut duosi:\n\nAlloohumma innaa nasta'iinuka va nastagfiruka va nu'minu bika va natavakkalu 'alayka va nusnii 'alaykal-khayra kullahu nashkuruka valaa nakfuruka va nakhla'u va natruku man yafjuruk. Alloohumma iyyaaka na'budu va laka nusollii va nasjudu va ilayka nas'aa va nahfidu narjuu rohmataka va nakhshaa 'azaabaka inna 'azaabaka bil-kuffaari mulhiq.",

    // Location
    location_choose: "📍 Joylashuvingizni tanlang:",
    select_location_method:
      "📍 Joylashuvingizni tanlang yoki GPS orqali yuboring:",
    send_gps_location: "📏 Iltimos, GPS joylashuvingizni yuboring:",
    location_send:
      "Iltimos, joylashuvingizni yuboring yoki ro'yxatdan tanlang:",
    location_btn_send: "📍 Joylashuvni yuborish",
    location_saved: "✅ Joylashuvingiz saqlandi: {location}",
    location_detected:
      "📍 Sizning joylashuvingiz: {location}\nEng yaqin shahar aniqlandi!",

    // User blocked
    user_blocked:
      "⛔️ Kechirasiz, siz botdan foydalanish huquqidan mahrum etilgansiz.",

    // Greeting
    greeting_send:
      "💌 Tabrik xabaringizni yuboring:\n\n⚠️ Tabrikingizda imlo xatoligi va nomaqbul (18+) so'zlar ishlatmang!",
    greeting_confirm: "Tabrikingizni tasdiqlaysizmi?",
    greeting_sent_admin:
      "✅ Tabrikingiz administratorga yuborildi.\nAgar tasdiqlansa, kanalga joylanadi!",
    greeting_approved:
      "✅ Sizning xabaringiz tasdiqlandi va kanalga yuborildi!",
    greeting_rejected:
      "❌ Sizning xabaringiz rad etildi. Iltimos, qayta yuboring.",
    greeting_error: "❌ Xatolik yuz berdi. Qayta urinib ko'ring.",

    // Suggestion
    suggestion_send: "💡 Taklifingizni yuboring:",
    suggestion_sent: "✅ Taklifingiz yuborildi. Rahmat!",

    // About
    about_bot:
      "ℹ️ Bot haqida:\n\nDasturchi: @{admin}\nBot vazifasi: Ramazon taqvimi va tabriklar\n\nIjtimoiy tarmoqlar 👇",

    // Calendar
    calendar_title: "📅 Ramazon taqvimi",
    calendar_select_date: "Sanani tanlang:",

    // Ramadan countdown
    ramadan_countdown:
      "⏰ Ramazonga qoldi:\n\n📆 {days} kun\n⏰ {hours} soat\n⏱ {minutes} daqiqa\n⏳ {seconds} soniya\n\nHozirgi vaqt:\n📆 {date}\n⏰ {time}",
    btn_refresh: "🔁 Yangilash",

    // Errors
    error_unknown_command: "❌ Noma'lum buyruq. /start ni bosing.",
    error_try_again: "❌ Xatolik. Qayta urinib ko'ring.",

    // Admin
    admin_not_authorized: "❌ Siz admin emassiz!",

    // Channel membership
    must_join_channel:
      "⚠️ Botdan foydalanish uchun kanalga obuna bo'lishingiz kerak!\n\n📢 Kanal: {channel}",
    must_join_channels:
      "⚠️ Botdan foydalanish uchun quyidagi kanallarga obuna bo'lishingiz kerak:",
    join_channel: "📢 Kanalga obuna bo'lish",
    check_subscription: "✅ Obunani tekshirish",
    welcome_after_join:
      "✅ Xush kelibsiz! Endi botdan foydalanishingiz mumkin.",

    // Prayer times
    prayer_times_today: "🕌 Bugungi namoz vaqtlari\n📍 {location}\n📅 {date}",
    prayer_fajr: "🌅 Bomdod: {time}",
    prayer_sunrise: "☀️ Quyosh: {time}",
    prayer_dhuhr: "☀️ Peshin: {time}",
    prayer_asr: "🌤 Asr: {time}",
    prayer_maghrib: "🌇 Shom: {time}",
    prayer_isha: "🌙 Xufton: {time}",
    prayer_next:
      "\n⏰ Keyingi namoz: {prayer} - {time}\nQolgan vaqt: {remaining}",

    // Location selection
    select_location_method: "📍 Joylashuvni qanday tanlashni xohlaysiz?",
    btn_send_gps: "📍 GPS joylashuvni yuborish",
    btn_gps_location: "📍 GPS joylashuvni yuborish",
    btn_manual_select: "📋 Qo'lda tanlash",
    btn_select_city: "🏙 Shaharni tanlash",
    location_error: "❌ Joylashuvni aniqlab bo'lmadi. Qayta urinib ko'ring.",

    // Phone number request
    request_phone: "📱 Iltimos, telefon raqamingizni yuboring:",
    btn_send_phone: "📱 Raqamni yuborish",
    phone_saved: "✅ Telefon raqamingiz saqlandi!",

    // Terms and Conditions
    terms_message:
      "📋 Botdan foydalanishdan oldin Foydalanish shartlari bilan tanishib chiqing va roziliging bering:",
    btn_read_terms: "📄 Shartlarni o'qish",
    btn_accept_terms: "✅ Roziman",
    terms_accepted:
      "✅ Rahmat! Endi botning barcha imkoniyatlaridan foydalanishingiz mumkin.",

    // Calendar options
    btn_daily: "📆 Kunlik",
    btn_weekly: "📅 Haftalik",
    btn_qibla: "🧭 Qiblani aniqlash",
    calendar_daily_title: "📆 Bugungi namoz vaqtlari",
    calendar_weekly_title: "📅 Haftalik namoz vaqtlari",

    // Qibla
    qibla_title: "Qibla yo'nalishi",
    qibla_bearing: "Burchak",
    qibla_direction: "Yo'nalish",
    qibla_distance: "Masofa",
    qibla_kaaba: "Ka'ba koordinatalari",
    qibla_instruction:
      "📱 Telefoningizni shimolga qarating va ko'rsatilgan burchak bo'yicha qiblani toping.",
    error_no_location:
      "❌ Joylashuvingiz aniqlanmagan!\n\nIltimos, joylashuvingizni kiriting.",
    btn_set_location: "📍 Joylashuvni kiriting",

    // Reminder settings
    reminder_settings: "🔔 Eslatma sozlamalari",
    reminder_enabled: "✅ Eslatmalar yoqilgan",
    reminder_disabled: "❌ Eslatmalar o'chirilgan",
    btn_toggle_reminders: "🔔 Eslatmalarni yoqish/o'chirish",
    btn_reminder_time: "⏰ Eslatma vaqti: {minutes} daqiqa oldin",
    btn_reminder_5min: "5 daqiqa oldin",
    btn_reminder_10min: "10 daqiqa oldin",
    btn_reminder_15min: "15 daqiqa oldin",
    btn_reminder_30min: "30 daqiqa oldin",
    reminder_updated: "✅ Eslatma sozlamalari yangilandi!",
    reminder_before_prayer:
      "🔔 Eslatma: {prayer} namoziga {minutes} daqiqa qoldi!\n⏰ Vaqti: {time}",
    reminder_prayer_time: "🕌 {prayer} namozi vaqti kirdi!\n⏰ {time}",

    // Settings
    settings_menu: "⚙️ Sozlamalar menyu",
    btn_prayer_reminders: "⏰ Namoz eslatmalari",
    btn_prayer_settings: "⚙️ Namoz sozlamalari",
    btn_back_main: "🔙 Bosh menyu",
    configure_reminders: "⏰ Namoz eslatmalarini sozlang:",
    current_reminder_time: "Joriy eslatma vaqti",
    minutes: "daqiqa",
    minutes_before: "daq. oldin",
    reminder_set_to: "Eslatma qo'yildi",
    saved: "✅ Saqlandi",
    btn_disable_all_reminders: "❌ Barcha eslatmalarni o'chirish",
    btn_enable_all_reminders: "✅ Barcha eslatmalarni yoqish",
    all_reminders_disabled: "❌ Barcha eslatmalar o'chirildi",
    all_reminders_enabled: "✅ Barcha eslatmalar yoqildi",

    // Prayer settings
    prayer_settings_title: "⚙️ Namoz vaqtlari sozlamalari",
    calculation_method: "Hisoblash usuli",
    madhab: "Mazhab",
    btn_select_method: "📐 Hisoblash usulini tanlash",
    btn_select_madhab: "📖 Mazhabni tanlash",
    select_calculation_method: "📐 Hisoblash usulini tanlang:",
    select_madhab: "📖 Mazhabni tanlang:",
    method_karachi: "Karachi universiteti",
    method_isna: "Shimoliy Amerika islom jamiyati (ISNA)",
    method_mwl: "Musulmon dunyosi ligasi",
    method_makkah: "Umm al-Qura universiteti (Makka)",
    method_egypt: "Misr usuli",
    method_jafari: "Jafari mazhabi (Shia)",
    method_tehran: "Tehron universiteti",
    method_gulf: "Fors ko'rfazi mintaqasi",
    method_kuwait: "Quvayt",
    method_qatar: "Qatar",
    method_singapore: "Singapur",
    method_france: "Frantsiya islom tashkilotlari ittifoqi",
    method_turkey: "Turkiya diniy ishlar boshqarmasi",
    method_russia: "Rossiya musulmonlari ma'muriyati",
    madhab_shafi: "Shofeiy",
    madhab_hanafi: "Hanafiy",

    // Week days
    monday: "Dushanba",
    tuesday: "Seshanba",
    wednesday: "Chorshanba",
    thursday: "Payshanba",
    friday: "Juma",
    saturday: "Shanba",
    sunday: "Yakshanba",

    // Prayer names
    fajr: "Bomdod",
    dhuhr: "Peshin",
    asr: "Asr",
    maghrib: "Shom",
    isha: "Xufton",
  },

  cr: {
    // Uzbek Cyrillic
    welcome:
      "Ассалому Алайкум! Рамазон Тақвим ботига хуш келибсиз!\nБотдан фойдаланиш учун тилни танланг 👇",
    choose_language: "🌐 Тилни танланг:",
    language_set: "✅ Тил ўзгартирилди!",
    main_menu: "Асосий меню 📋",

    // Buttons
    btn_calendar: "📅 Тақвим",
    btn_calendar_webapp: "📱 Тақвим (WebApp)",
    btn_send_greeting: "💌 Табрик юбориш",
    btn_about: "ℹ️ Бот ҳақида",
    btn_suggest: "💡 Таклиф юбориш",
    btn_settings: "⚙️ Созламалар",
    btn_prayers: "🤲 Дуолар",
    btn_location: "📍 Жойлашув",
    btn_ramadan_countdown: "⏰ Рамазонга қанча қолди?",
    btn_change_language: "🌐 Тилни ўзгартириш",
    btn_back: "◀️ Орқага",
    btn_back_menu: "🏠 Асосий менюга қайтиш",
    btn_cancel: "❌ Бекор қилиш",
    btn_confirm: "✅ Тасдиқлаш",
    btn_reject: "❌ Рад этиш",

    // Prayers
    prayers_title: "🤲 Дуолар",
    prayers_select: "Дуони танланг:",
    no_prayers: "⚠️ Ҳозирча дуолар мавжуд эмас.",
    prayer_not_found: "❌ Дуо топилмади.",
    prayers_text:
      "🤲 Намоздан кейинги дуолар:\n\nСубҳ намозидан кейин:\nСубҳааналлооҳи вал ҳамдулиллааҳи валаа илааҳа иллаллоҳу валлооҳу акбар. (33 марта)\n\nПесҳин, Аср, Шом ва Хуфтон намозидан кейин:\nСубҳааналлооҳи вал ҳамдулиллааҳи валаа илааҳа иллаллоҳу валлооҳу акбар. (33 марта)\n\nАятул Курси ўқиш.\n\n🤲 Қунут дуоси:\n\nАллооҳумма иннаа настаъиинука ва настағфирука ва нуъмину бика ва натаваккалу ъалайка ва нуснии ъалайкал-хайра куллаҳу нашкурука валаа накфурука ва нахлаъу ва натруку ман яфжурук. Аллооҳумма иййаака наъбуду ва лака нусоллии ва насжуду ва илайка насъаа ва наҳфиду наржуу роҳматака ва нахшаа ъазаабака инна ъазаабака бил-куффаари мулҳиқ.",

    // Location
    location_choose: "📍 Жойлашувингизни танланг:",
    select_location_method:
      "📍 Жойлашувингизни танланг ёки GPS орқали юборинг:",
    send_gps_location: "📏 Илтимос, GPS жойлашувингизни юборинг:",
    location_send: "Илтимос, жойлашувингизни юборинг ёки рўйхатдан танланг:",
    location_btn_send: "📍 Жойлашувни юбориш",
    location_saved: "✅ Жойлашувингиз сақланди: {location}",
    location_detected:
      "📍 Сизнинг жойлашувингиз: {location}\nЭнг яқин шаҳар аниқланди!",

    // User blocked
    user_blocked:
      "⛔️ Кечирасиз, сиз ботдан фойдаланиш ҳуқуқидан маҳрум этилгансиз.",

    // Greeting
    greeting_send:
      "💌 Табрик хабарингизни юборинг:\n\n⚠️ Табрикингизда имло хатолиги ва номақбул (18+) сўзлар ишлатманг!",
    greeting_confirm: "Табрикингизни тасдиқлайсизми?",
    greeting_sent_admin:
      "✅ Табрикингиз администраторга юборилди.\nАгар тасдиқланса, каналга жойланади!",
    greeting_approved: "✅ Сизнинг хабарингиз тасдиқланди ва каналга юборилди!",
    greeting_rejected:
      "❌ Сизнинг хабарингиз рад этилди. Илтимос, қайта юборинг.",
    greeting_error: "❌ Хатолик юз берди. Қайта уриниб кўринг.",

    // Suggestion
    suggestion_send: "💡 Таклифингизни юборинг:",
    suggestion_sent: "✅ Таклифингиз юборилди. Раҳмат!",

    // About
    about_bot:
      "ℹ️ Бот ҳақида:\n\nДастурчи: @{admin}\nБот вазифаси: Рамазон тақвими ва табриклар\n\nИжтимоий тармоқлар 👇",

    // Calendar
    calendar_title: "📅 Рамазон тақвими",
    calendar_select_date: "Санани танланг:",

    // Ramadan countdown
    ramadan_countdown:
      "⏰ Рамазонга қолди:\n\n📆 {days} кун\n⏰ {hours} соат\n⏱ {minutes} дақиқа\n⏳ {seconds} сония\n\nҲозирги вақт:\n📆 {date}\n⏰ {time}",
    btn_refresh: "🔁 Янгилаш",

    // Errors
    error_unknown_command: "❌ Номаълум буйруқ. /start ни босинг.",
    error_try_again: "❌ Хатолик. Қайта уриниб кўринг.",

    // Admin
    admin_not_authorized: "❌ Сиз админ эмассиз!",

    // Channel membership
    must_join_channel:
      "⚠️ Ботдан фойдаланиш учун каналга обуна бўлишингиз керак!\n\n📢 Канал: {channel}",
    join_channel: "📢 Каналга обуна бўлиш",
    check_subscription: "✅ Обунани текшириш",
    welcome_after_join: "✅ Хуш келибсиз! Энди ботдан фойдаланишингиз мумкин.",

    // Prayer times
    prayer_times_today: "🕌 Бугунги намоз вақтлари\n📍 {location}\n📅 {date}",
    prayer_fajr: "🌅 Бомдод: {time}",
    prayer_sunrise: "☀️ Қуёш: {time}",
    prayer_dhuhr: "☀️ Пешин: {time}",
    prayer_asr: "🌤 Аср: {time}",
    prayer_maghrib: "🌇 Шом: {time}",
    prayer_isha: "🌙 Хуфтон: {time}",
    prayer_next:
      "\n⏰ Кейинги намоз: {prayer} - {time}\nҚолган вақт: {remaining}",

    // Location selection
    select_location_method: "📍 Жойлашувни қандай танлашни хоҳлайсиз?",
    btn_send_gps: "📍 GPS жойлашувни юбориш",
    btn_gps_location: "📍 GPS жойлашувни юбориш",
    btn_manual_select: "📋 Қўлда танлаш",
    btn_select_city: "🏙 Шаҳарни танлаш",
    location_error: "❌ Жойлашувни аниқлаб бўлмади. Қайта уриниб кўринг.",

    // Phone number request
    request_phone: "📱 Илтимос, телефон рақамингизни юборинг:",
    btn_send_phone: "📱 Рақамни юбориш",
    phone_saved: "✅ Телефон рақамингиз сақланди!",

    // Terms and Conditions
    terms_message:
      "📋 Ботдан фойдаланишдан олдин Фойдаланиш шартлари билан танишиб чиқинг ва розилигинг беринг:",
    btn_read_terms: "📄 Шартларни ўқиш",
    btn_accept_terms: "✅ Розиман",
    terms_accepted:
      "✅ Раҳмат! Энди ботнинг барча имкониятларидан фойдаланишингиз мумкин.",

    // Calendar options
    btn_daily: "📆 Кунлик",
    btn_weekly: "📅 Ҳафталик",
    btn_qibla: "🧭 Қиблани аниқлаш",
    calendar_daily_title: "📆 Бугунги намоз вақтлари",
    calendar_weekly_title: "📅 Ҳафталик намоз вақтлари",

    // Qibla
    qibla_title: "Қибла йўналиши",
    qibla_bearing: "Бурчак",
    qibla_direction: "Йўналиш",
    qibla_distance: "Масофа",
    qibla_kaaba: "Каъба координаталари",
    qibla_instruction:
      "📱 Телефонингизни шимолга қаратинг ва кўрсатилган бурчак бўйича қиблани топинг.",
    error_no_location:
      "❌ Жойлашувингиз аниқланмаган!\n\nИлтимос, жойлашувингизни киритинг.",
    btn_set_location: "📍 Жойлашувни киритинг",

    // Reminder settings
    reminder_settings: "🔔 Эслатма созламалари",
    reminder_enabled: "✅ Эслатмалар ёқилган",
    reminder_disabled: "❌ Эслатмалар ўчирилган",
    btn_toggle_reminders: "🔔 Эслатмаларни ёқиш/ўчириш",
    btn_reminder_time: "⏰ Эслатма вақти: {minutes} дақиқа олдин",
    btn_reminder_5min: "5 дақиқа олдин",
    btn_reminder_10min: "10 дақиқа олдин",

    // Settings scene
    settings_menu: "⚙️ Созламалар менюси",
    btn_prayer_reminders: "⏰ Намоз эслатмалари",
    btn_prayer_settings: "⚙️ Намоз созламалари",
    btn_back_main: "🔙 Бош меню",
    configure_reminders: "⏰ Намоз эслатмаларини созланг:",
    current_reminder_time: "Жорий эслатма вақти",
    minutes: "дақиқа",
    minutes_before: "дақ. олдин",
    reminder_set_to: "Эслатма қўйилди",
    saved: "✅ Сақланди",
    btn_disable_all_reminders: "❌ Барча эслатмаларни ўчириш",
    btn_enable_all_reminders: "✅ Барча эслатмаларни ёқиш",
    all_reminders_disabled: "❌ Барча эслатмалар ўчирилди",
    all_reminders_enabled: "✅ Барча эслатмалар ёқилди",

    // Prayer settings
    prayer_settings_title: "⚙️ Намоз вақтлари созламалари",
    calculation_method: "Ҳисоблаш усули",
    madhab: "Мазҳаб",
    btn_select_method: "📐 Ҳисоблаш усулини танлаш",
    btn_select_madhab: "📖 Мазҳабни танлаш",
    select_calculation_method: "📐 Ҳисоблаш усулини танланг:",
    select_madhab: "📖 Мазҳабни танланг:",
    method_karachi: "Карачи университети",
    method_isna: "Шимолий Америка ислом жамияти (ИСНА)",
    method_mwl: "Муслимон дунёси лигаси",
    method_makkah: "Умм аль-Қура университети (Макка)",
    method_egypt: "Миср усули",
    method_jafari: "Жафари мазҳаби (Шиа)",
    method_tehran: "Теҳрон университети",
    method_gulf: "Форс кўрфази минтақаси",
    method_kuwait: "Қувайт",
    method_qatar: "Қатар",
    method_singapore: "Сингапур",
    method_france: "Франция ислом ташкилотлари иттифоқи",
    method_turkey: "Туркия диний ишлар бошқармаси",
    method_russia: "Россия мусулмонлари маъмурияти",
    madhab_shafi: "Шофеий",
    madhab_hanafi: "Ҳанафий",
    saved: "✅ Сақланди",
    btn_reminder_15min: "15 дақиқа олдин",
    btn_reminder_30min: "30 дақиқа олдин",
    reminder_updated: "✅ Эслатма созламалари янгиланди!",
    reminder_before_prayer:
      "🔔 Эслатма: {prayer} намозига {minutes} дақиқа қолди!\n⏰ Вақти: {time}",
    reminder_prayer_time: "🕌 {prayer} намози вақти кирди!\n⏰ {time}",

    // Week days
    monday: "Душанба",
    tuesday: "Сешанба",
    wednesday: "Чоршанба",
    thursday: "Пайшанба",
    friday: "Жума",
    saturday: "Шанба",
    sunday: "Якшанба",

    // Prayer names
    fajr: "Бомдод",
    dhuhr: "Пешин",
    asr: "Аср",
    maghrib: "Шом",
    isha: "Хуфтон",
  },

  ru: {
    // Russian
    welcome:
      "Ассалому Алайкум! Добро пожаловать в бот Рамазан!\nВыберите язык для использования бота 👇",
    choose_language: "🌐 Выберите язык:",
    language_set: "✅ Язык изменен!",
    main_menu: "Главное меню 📋",

    // Buttons
    btn_calendar: "📅 Календарь",
    btn_calendar_webapp: "📱 Календарь (WebApp)",
    btn_send_greeting: "💌 Отправить поздравление",
    btn_about: "ℹ️ О боте",
    btn_suggest: "💡 Отправить предложение",
    btn_settings: "⚙️ Настройки",
    btn_prayers: "🤲 Молитвы",
    btn_location: "📍 Местоположение",
    btn_ramadan_countdown: "⏰ Сколько до Рамадана?",
    btn_change_language: "🌐 Сменить язык",
    btn_back: "◀️ Назад",
    btn_back_menu: "🏠 Вернуться в главное меню",
    btn_cancel: "❌ Отменить",
    btn_confirm: "✅ Подтвердить",
    btn_reject: "❌ Отклонить",

    // Prayers
    prayers_title: "🤲 Молитвы",
    prayers_select: "Выберите молитву:",
    no_prayers: "⚠️ Пока нет доступных молитв.",
    prayer_not_found: "❌ Молитва не найдена.",
    prayers_text:
      "🤲 Молитвы после намаза:\n\nПосле утреннего намаза:\nСубханаллахи валь хамдулилляхи валя иляха илляллаху валлаху акбар. (33 раза)\n\nПосле полуденного, послеполуденного, вечернего и ночного намазов:\nСубханаллахи валь хамдулилляхи валя иляха илляллаху валлаху акбар. (33 раза)\n\nЧтение Аятуль Курси.\n\n🤲 Молитва Кунут:\n\nАллахумма инна настаинука ва настагфирука ва нумину бика ва натаваккалу аляйка ва нуснии аляйкаль-хайра кулляху нашкурука валя накфурука ва нахляу ва натруку ман яфджурук. Аллахумма иййака набуду ва ляка нусоллии ва насджуду ва иляйка насаа ва нахфиду нарджуу рахматака ва нахшаа азабака инна азабака биль-куффари мулхик.",

    // Location
    location_choose: "📍 Выберите ваше местоположение:",
    select_location_method:
      "📍 Выберите ваше местоположение или отправьте через GPS:",
    send_gps_location: "📏 Пожалуйста, отправьте ваше GPS местоположение:",
    location_send:
      "Пожалуйста, отправьте ваше местоположение или выберите из списка:",
    location_btn_send: "📍 Отправить местоположение",
    location_saved: "✅ Ваше местоположение сохранено: {location}",
    location_detected:
      "📍 Ваше местоположение: {location}\nБлижайший город определен!",

    // User blocked
    user_blocked: "⛔️ К сожалению, вы лишены права пользоваться этим ботом.",

    // Greeting
    greeting_send:
      "💌 Отправьте ваше поздравление:\n\n⚠️ Не используйте оскорбительные слова (18+) и проверьте орфографию!",
    greeting_confirm: "Подтвердить ваше поздравление?",
    greeting_sent_admin:
      "✅ Ваше поздравление отправлено администратору.\nЕсли будет одобрено, оно будет опубликовано в канале!",
    greeting_approved: "✅ Ваше сообщение одобрено и опубликовано в канале!",
    greeting_rejected:
      "❌ Ваше сообщение отклонено. Пожалуйста, отправьте снова.",
    greeting_error: "❌ Произошла ошибка. Попробуйте еще раз.",

    // Suggestion
    suggestion_send: "💡 Отправьте ваше предложение:",
    suggestion_sent: "✅ Ваше предложение отправлено. Спасибо!",

    // About
    about_bot:
      "ℹ️ О боте:\n\nРазработчик: @{admin}\nНазначение бота: Календарь Рамазана и поздравления\n\nСоциальные сети 👇",

    // Calendar
    calendar_title: "📅 Календарь Рамазана",
    calendar_select_date: "Выберите дату:",

    // Ramadan countdown
    ramadan_countdown:
      "⏰ До Рамазана осталось:\n\n📆 {days} дней\n⏰ {hours} часов\n⏱ {minutes} минут\n⏳ {seconds} секунд\n\nТекущее время:\n📆 {date}\n⏰ {time}",
    btn_refresh: "🔁 Обновить",

    // Errors
    error_unknown_command: "❌ Неизвестная команда. Нажмите /start.",
    error_try_again: "❌ Ошибка. Попробуйте еще раз.",

    // Admin
    admin_not_authorized: "❌ Вы не администратор!",

    // Channel membership
    must_join_channel:
      "⚠️ Для использования бота необходимо подписаться на канал!\n\n📢 Канал: {channel}",
    must_join_channels:
      "⚠️ Для использования бота необходимо подписаться на следующие каналы:",
    join_channel: "📢 Подписаться на канал",
    check_subscription: "✅ Проверить подписку",
    welcome_after_join:
      "✅ Добро пожаловать! Теперь вы можете использовать бота.",

    // Prayer times
    prayer_times_today: "🕌 Время намаза сегодня\n📍 {location}\n📅 {date}",
    prayer_fajr: "🌅 Фаджр: {time}",
    prayer_sunrise: "☀️ Восход: {time}",
    prayer_dhuhr: "☀️ Зухр: {time}",
    prayer_asr: "🌤 Аср: {time}",
    prayer_maghrib: "🌇 Магриб: {time}",
    prayer_isha: "🌙 Иша: {time}",
    prayer_next:
      "\n⏰ Следующий намаз: {prayer} - {time}\nОсталось времени: {remaining}",

    // Location selection
    select_location_method: "📍 Как вы хотите выбрать местоположение?",
    btn_send_gps: "📍 Отправить GPS местоположение",
    btn_gps_location: "📍 Отправить GPS местоположение",
    btn_manual_select: "📋 Выбрать вручную",
    btn_select_city: "🏙 Выбрать город",
    location_error:
      "❌ Не удалось определить местоположение. Попробуйте еще раз.",

    // Phone number request
    request_phone: "📱 Пожалуйста, отправьте ваш номер телефона:",
    btn_send_phone: "📱 Отправить номер",
    phone_saved: "✅ Ваш номер телефона сохранен!",

    // Terms and Conditions
    terms_message:
      "📋 Перед использованием бота ознакомьтесь с Условиями использования и дайте согласие:",
    btn_read_terms: "📄 Прочитать условия",
    btn_accept_terms: "✅ Согласен",
    terms_accepted:
      "✅ Спасибо! Теперь вы можете использовать все возможности бота.",

    // Calendar options
    btn_daily: "📆 Ежедневно",
    btn_weekly: "📅 Еженедельно",
    btn_qibla: "🧭 Определить киблу",
    calendar_daily_title: "📆 Время намаза сегодня",
    calendar_weekly_title: "📅 Время намаза на неделю",

    // Qibla
    qibla_title: "Направление киблы",
    qibla_bearing: "Угол",
    qibla_direction: "Направление",
    qibla_distance: "Расстояние",
    qibla_kaaba: "Координаты Каабы",
    qibla_instruction:
      "📱 Направьте телефон на север и найдите киблу по указанному углу.",
    error_no_location:
      "❌ Ваше местоположение не определено!\n\nПожалуйста, введите ваше местоположение.",
    btn_set_location: "📍 Ввести местоположение",

    // Reminder settings
    reminder_settings: "🔔 Настройки напоминаний",
    reminder_enabled: "✅ Напоминания включены",
    reminder_disabled: "❌ Напоминания выключены",
    btn_toggle_reminders: "🔔 Вкл/Выкл напоминания",
    btn_reminder_time: "⏰ Время напоминания: за {minutes} минут",
    btn_reminder_5min: "За 5 минут",
    btn_reminder_10min: "За 10 минут",
    btn_reminder_15min: "За 15 минут",
    btn_reminder_30min: "За 30 минут",
    reminder_updated: "✅ Настройки напоминаний обновлены!",
    reminder_before_prayer:
      "🔔 Напоминание: до {prayer} осталось {minutes} минут!\n⏰ Время: {time}",
    reminder_prayer_time: "🕌 Наступило время {prayer}!\n⏰ {time}",

    // Settings scene
    settings_menu: "⚙️ Меню настроек",
    btn_prayer_reminders: "⏰ Напоминания о намазе",
    btn_prayer_settings: "⚙️ Настройки намаза",
    btn_back_main: "🔙 Главное меню",
    configure_reminders: "⏰ Настройте напоминания о намазе:",
    current_reminder_time: "Текущее время напоминания: за {minutes} минут",
    minutes: "минут",
    minutes_before: "За {minutes} минут",
    reminder_set_to: "Напоминание установлено",
    saved: "✅ Сохранено",
    btn_disable_all_reminders: "❌ Выключить все напоминания",
    btn_enable_all_reminders: "✅ Включить все напоминания",
    all_reminders_disabled: "❌ Все напоминания выключены",
    all_reminders_enabled: "✅ Все напоминания включены",
    reminder_set_to: "Напоминание установлено за {minutes} минут",
    saved: "✅ Сохранено",

    // Prayer settings
    prayer_settings_title: "⚙️ Настройки времени намаза",
    calculation_method: "Метод расчета",
    madhab: "Мазхаб",
    btn_select_method: "📐 Выбрать метод расчета",
    btn_select_madhab: "📖 Выбрать мазхаб",
    select_calculation_method: "📐 Выберите метод расчета:",
    select_madhab: "📖 Выберите мазхаб:",
    method_karachi: "Университет Карачи",
    method_isna: "Исламское общество Северной Америки (ISNA)",
    method_mwl: "Мусульманская мировая лига",
    method_makkah: "Университет Умм аль-Кура (Мекка)",
    method_egypt: "Египетский метод",
    method_jafari: "Джафаритский мазхаб (Шииты)",
    method_tehran: "Тегеранский университет",
    method_gulf: "Регион Персидского залива",
    method_kuwait: "Кувейт",
    method_qatar: "Катар",
    method_singapore: "Сингапур",
    method_france: "Союз исламских организаций Франции",
    method_turkey: "Управление по делам религии Турции",
    method_russia: "Духовное управление мусульман России",
    madhab_shafi: "Шафиитский",
    madhab_hanafi: "Ханафитский",

    // Week days
    monday: "Понедельник",
    tuesday: "Вторник",
    wednesday: "Среда",
    thursday: "Четверг",
    friday: "Пятница",
    saturday: "Суббота",
    sunday: "Воскресенье",

    // Prayer names
    fajr: "Фаджр",
    dhuhr: "Зухр",
    asr: "Аср",
    maghrib: "Магриб",
    isha: "Иша",
  },
};
