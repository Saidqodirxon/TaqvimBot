const { Scenes, Markup } = require("telegraf");
const { t, getUserLanguage } = require("../utils/translator");
const { getMainMenuKeyboard } = require("../utils/keyboards");
const User = require("../models/User");
const Location = require("../models/Location");
const Settings = require("../models/Settings");
const {
  findNearestCitiesWithinRadius,
  searchLocationsByName,
  getLocationsPaginated,
  getOrCreateLocationFromAladhan,
} = require("../utils/location");
const redisCache = require("../utils/redis");

// Location Selection Scene (NEW - with GPS, Search, Pagination)
const locationScene = new Scenes.BaseScene("location_v2");

// Store pagination state in session
locationScene.enter(async (ctx) => {
  try {
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    // Initialize session state
    ctx.session.locationState = {
      page: 1,
      searchQuery: null,
      mode: null, // 'gps', 'search', 'manual'
    };

    const message =
      (await t(lang, "select_location_method")) ||
      "📍 Joylashuvni qanday tanlaysiz?";

    const buttons = [
      [
        Markup.button.callback(
          (await t(lang, "btn_gps_location")) || "📍 GPS orqali yuborish",
          "location_gps"
        ),
      ],
      [Markup.button.callback("🔍 Qidirish", "location_search")],
      [Markup.button.callback("📋 Ro'yxatdan tanlash", "location_list")],
      [
        Markup.button.callback(
          (await t(lang, "btn_back_menu")) || "🏠 Bosh menyu",
          "location_cancel"
        ),
      ],
    ];

    await ctx.reply(message, Markup.inlineKeyboard(buttons));
  } catch (error) {
    console.error("Location scene enter error:", error);
    await ctx.reply("❌ Xatolik yuz berdi");
  }
});

// GPS Location Handler
locationScene.action("location_gps", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const lang = getUserLanguage(ctx.session.user);

    ctx.session.locationState.mode = "gps";

    const message =
      (await t(lang, "send_gps_location")) ||
      "📍 GPS joylashuvingizni yuboring\n\n" +
        "Telegram'da:\n" +
        "📎 → Location → Send My Current Location";

    const keyboard = Markup.keyboard([
      [
        Markup.button.locationRequest(
          (await t(lang, "btn_share_location")) || "📍 Joylashuvni ulashish"
        ),
      ],
      [(await t(lang, "btn_cancel")) || "❌ Bekor qilish"],
    ]).resize();

    await ctx.reply(message, keyboard);
  } catch (error) {
    console.error("GPS location action error:", error);
    await ctx.answerCbQuery("❌ Xatolik");
  }
});

// Handle GPS location message
locationScene.on("location", async (ctx) => {
  try {
    const { latitude, longitude } = ctx.message.location;
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    await ctx.reply("🔍 Eng yaqin joylashuvlar qidirilmoqda...");

    // Get search radius from settings
    const radiusKm = await Settings.getSetting("location_search_radius_km", 50);

    // Find nearest locations
    const nearestLocations = await findNearestCitiesWithinRadius(
      latitude,
      longitude,
      radiusKm,
      5 // Show top 5
    );

    if (nearestLocations && nearestLocations.length > 0) {
      // Show nearest locations
      const buttons = nearestLocations.map((loc) => [
        Markup.button.callback(
          `📍 ${loc.name_uz || loc.name} (${loc.distance.toFixed(1)} km)`,
          `location_select_${loc._id}`
        ),
      ]);

      // Add custom location option
      buttons.push([
        Markup.button.callback(
          "➕ Boshqa joylashuv (Aladhan)",
          `location_custom_${latitude}_${longitude}`
        ),
      ]);

      buttons.push([
        Markup.button.callback(
          (await t(lang, "btn_back")) || "⬅️ Orqaga",
          "location_back"
        ),
      ]);

      await ctx.reply(
        `📍 Sizga eng yaqin joylashuvlar (${radiusKm} km radius):\n\n` +
          "Eng yaqin shaharni tanlang yoki Aladhan orqali o'z GPS locationingizni saqlang:",
        Markup.inlineKeyboard(buttons)
      );
    } else {
      // No locations found - use Aladhan
      await ctx.reply(
        "📍 Yaqin atrofda saqlangan joylashuvlar topilmadi.\n" +
          "Aladhan API orqali joylashuvingizni saqlaymiz..."
      );

      const customLocation = await getOrCreateLocationFromAladhan(
        latitude,
        longitude,
        "Custom Location"
      );

      await saveUserLocation(ctx, customLocation);
    }
  } catch (error) {
    console.error("Location message handler error:", error);
    await ctx.reply("❌ Xatolik yuz berdi");
  }
});

// Search Handler
locationScene.action("location_search", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const lang = getUserLanguage(ctx.session.user);

    ctx.session.locationState.mode = "search";

    await ctx.reply(
      "🔍 Shahar nomini yozing:\n\n" + "Masalan: Toshkent, Самарканд, Buxoro",
      Markup.keyboard([
        [(await t(lang, "btn_cancel")) || "❌ Bekor qilish"],
      ]).resize()
    );
  } catch (error) {
    console.error("Search action error:", error);
    await ctx.answerCbQuery("❌ Xatolik");
  }
});

// Handle search query
locationScene.on("text", async (ctx) => {
  try {
    const query = ctx.message.text;
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    // Check if in search mode
    if (ctx.session.locationState?.mode !== "search") {
      return;
    }

    // Cancel if needed
    if (
      query === (await t(lang, "btn_cancel")) ||
      query === "❌ Bekor qilish"
    ) {
      await ctx.scene.reenter();
      return;
    }

    await ctx.reply("🔍 Qidirilmoqda...");

    // Search locations
    const results = await searchLocationsByName(query, 10);

    if (results && results.length > 0) {
      const buttons = results.map((loc) => [
        Markup.button.callback(
          `📍 ${loc.name_uz || loc.name}`,
          `location_select_${loc._id}`
        ),
      ]);

      buttons.push([
        Markup.button.callback("🔄 Qayta qidirish", "location_search"),
      ]);

      buttons.push([
        Markup.button.callback(
          (await t(lang, "btn_back")) || "⬅️ Orqaga",
          "location_back"
        ),
      ]);

      await ctx.reply(
        `🔍 "${query}" bo'yicha ${results.length} ta natija topildi:`,
        Markup.inlineKeyboard(buttons)
      );
    } else {
      const buttons = [
        [Markup.button.callback("🔄 Qayta qidirish", "location_search")],
        [Markup.button.callback("📋 Ro'yxatdan tanlash", "location_list")],
        [
          Markup.button.callback(
            (await t(lang, "btn_back")) || "⬅️ Orqaga",
            "location_back"
          ),
        ],
      ];

      await ctx.reply(
        `❌ "${query}" topilmadi.\n\n` +
          "Boshqa nom bilan qidiring yoki ro'yxatdan tanlang:",
        Markup.inlineKeyboard(buttons)
      );
    }
  } catch (error) {
    console.error("Search text handler error:", error);
    await ctx.reply("❌ Xatolik");
  }
});

// List with Pagination
locationScene.action("location_list", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    ctx.session.locationState.mode = "list";
    ctx.session.locationState.page = 1;

    await showLocationList(ctx);
  } catch (error) {
    console.error("List action error:", error);
    await ctx.answerCbQuery("❌ Xatolik");
  }
});

// Pagination - Next Page
locationScene.action(/location_page_(\d+)/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const page = parseInt(ctx.match[1]);
    ctx.session.locationState.page = page;

    await showLocationList(ctx, true); // true = edit message
  } catch (error) {
    console.error("Pagination error:", error);
    await ctx.answerCbQuery("❌ Xatolik");
  }
});

// Show location list with pagination
async function showLocationList(ctx, editMode = false) {
  try {
    const lang = getUserLanguage(ctx.session.user);
    const page = ctx.session.locationState.page || 1;
    const limit = await Settings.getSetting("location_pagination_limit", 10);

    const { locations, pagination } = await getLocationsPaginated(page, limit);

    const buttons = locations.map((loc) => [
      Markup.button.callback(
        `📍 ${loc.name_uz || loc.name}`,
        `location_select_${loc._id}`
      ),
    ]);

    // Pagination buttons
    const paginationRow = [];
    if (pagination.hasPrev) {
      paginationRow.push(
        Markup.button.callback("⬅️ Oldingi", `location_page_${page - 1}`)
      );
    }
    paginationRow.push(
      Markup.button.callback(`${page} / ${pagination.pages}`, "location_noop")
    );
    if (pagination.hasNext) {
      paginationRow.push(
        Markup.button.callback("Keyingi ➡️", `location_page_${page + 1}`)
      );
    }
    buttons.push(paginationRow);

    buttons.push([
      Markup.button.callback(
        (await t(lang, "btn_back")) || "⬅️ Orqaga",
        "location_back"
      ),
    ]);

    const message =
      `📋 Joylashuvlar ro'yxati (${pagination.total} ta)\n\n` +
      `Sahifa: ${page} / ${pagination.pages}`;

    if (editMode) {
      await ctx.editMessageText(message, Markup.inlineKeyboard(buttons));
    } else {
      await ctx.reply(message, Markup.inlineKeyboard(buttons));
    }
  } catch (error) {
    console.error("Show location list error:", error);
    throw error;
  }
}

// Select Location
locationScene.action(/location_select_(.+)/, async (ctx) => {
  try {
    await ctx.answerCbQuery("✅ Joylashuv saqlanmoqda...");
    const locationId = ctx.match[1];

    const location = await Location.findById(locationId);
    if (!location) {
      await ctx.answerCbQuery("❌ Joylashuv topilmadi");
      return;
    }

    await saveUserLocation(ctx, location);
  } catch (error) {
    console.error("Select location error:", error);
    await ctx.answerCbQuery("❌ Xatolik");
  }
});

// Custom location from Aladhan
locationScene.action(/location_custom_(.+)_(.+)/, async (ctx) => {
  try {
    await ctx.answerCbQuery("📍 Aladhan orqali joylashuv saqlanmoqda...");
    const latitude = parseFloat(ctx.match[1]);
    const longitude = parseFloat(ctx.match[2]);

    const location = await getOrCreateLocationFromAladhan(
      latitude,
      longitude,
      "My Location"
    );

    await saveUserLocation(ctx, location);
  } catch (error) {
    console.error("Custom location error:", error);
    await ctx.answerCbQuery("❌ Xatolik");
  }
});

// Save user location helper
async function saveUserLocation(ctx, location) {
  try {
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    // Update user in database
    await User.updateOne(
      { userId: user.userId },
      {
        $set: {
          location: {
            name: location.name_uz || location.name,
            latitude: location.latitude,
            longitude: location.longitude,
            timezone: location.timezone || "Asia/Tashkent",
          },
          locationId: location._id,
          locationRequestedAt: new Date(),
        },
      }
    );

    // Update session
    ctx.session.user.location = {
      name: location.name_uz || location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone || "Asia/Tashkent",
    };
    ctx.session.user.locationId = location._id;

    // Clear cache
    await redisCache.del(`user:${user.userId}`);

    await ctx.reply(
      `✅ Joylashuv saqlandi: ${location.name_uz || location.name}\n\n` +
        "Endi namoz vaqtlari va eslatmalar shu joylashuv bo'yicha yuboriladi.",
      await getMainMenuKeyboard(lang)
    );

    // Exit scene
    await ctx.scene.leave();
  } catch (error) {
    console.error("Save user location error:", error);
    throw error;
  }
}

// Back button
locationScene.action("location_back", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.scene.reenter();
  } catch (error) {
    console.error("Back action error:", error);
  }
});

// Cancel button
locationScene.action("location_cancel", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const lang = getUserLanguage(ctx.session.user);
    await ctx.reply(
      (await t(lang, "operation_cancelled")) || "❌ Bekor qilindi",
      await getMainMenuKeyboard(lang)
    );
    await ctx.scene.leave();
  } catch (error) {
    console.error("Cancel action error:", error);
  }
});

// No-op for pagination display
locationScene.action("location_noop", async (ctx) => {
  await ctx.answerCbQuery();
});

module.exports = locationScene;
