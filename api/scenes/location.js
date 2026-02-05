const { Scenes, Markup } = require("telegraf");
const { t, getUserLanguage } = require("../utils/translator");
const { getMainMenuKeyboard } = require("../utils/keyboards");
const User = require("../models/User");
const Location = require("../models/Location");
const {
  findNearestCity,
  getCitiesByRegion,
  getAllRegions,
  getTopCities,
  searchCities,
} = require("../utils/nearestCity");

// Location Scene
const locationScene = new Scenes.BaseScene("location");

locationScene.enter(async (ctx) => {
  try {
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    // Get 12 most popular cities
    const topCities = await getTopCities(12);

    // Build buttons (2 cities per row)
    const buttons = [];
    for (let i = 0; i < topCities.length; i += 2) {
      const row = [];
      const citiesInRow = topCities.slice(i, i + 2);

      for (const city of citiesInRow) {
        let cityName = city.nameUz || city.name;
        if (lang === "cr") cityName = city.nameCyrillic || city.name;
        if (lang === "ru") cityName = city.nameRu || city.name;

        row.push(
          Markup.button.callback(
            `📍 ${cityName}`,
            `select_location_${city._id}`
          )
        );
      }
      buttons.push(row);
    }

    // Add utility buttons
    buttons.push([
      Markup.button.callback("🗺️ Viloyatlar", "select_region"),
      Markup.button.callback("🛰️ GPS (Auto)", "send_gps"),
    ]);

    buttons.push([
      Markup.button.callback(await t(lang, "btn_back_menu"), "back_to_menu"),
    ]);

    const instruction =
      lang === "uz"
        ? "📍 <b>Joylashuvingizni tanlang:</b>\n\nQuyidagi ro'yxatdan tanlang yoki shahringiz nomini <b>yozib yuboring</b> (masalan: <i>Namangan</i>)"
        : lang === "ru"
          ? "📍 <b>Выберите ваше местоположение:</b>\n\nВыберите из списка ниже или <b>введите</b> название города (например: <i>Самарканд</i>)"
          : "📍 <b>Жойлашувингизни танланг:</b>\n\nҚуйидаги рўйхатдан танланг ёki шаҳрингиз номини <b>ёзиб юборинг</b> (масалан: <i>Наманган</i>)";

    await ctx.reply(instruction, {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard(buttons),
    });
  } catch (error) {
    console.error("Error entering location scene:", error);
    const lang = getUserLanguage(ctx.session.user);
    await ctx.reply(await t(lang, "error_try_again"));
  }
});

// Handle manual location selection
locationScene.action("manual_select", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    // Fetch static locations from database
    const locations = await Location.find({ isActive: true }).sort({
      isDefault: -1,
      name: 1,
    });

    if (!locations || locations.length === 0) {
      await ctx.editMessageText(
        "⚠️ Hozircha qo'lda tanlash uchun joylashuvlar mavjud emas. GPS orqali yuboring."
      );
      return;
    }

    // Build inline keyboard with locations
    const buttons = [];

    for (const location of locations) {
      let locationName = location.name;
      if (lang === "uz") locationName = location.nameUz || location.name;
      else if (lang === "cr") locationName = location.nameCr || location.name;
      else if (lang === "ru") locationName = location.nameRu || location.name;

      buttons.push([
        Markup.button.callback(
          `📍 ${locationName}`,
          `select_location_${location._id}`
        ),
      ]);
    }

    // Add back button
    buttons.push([
      Markup.button.callback(
        await t(lang, "btn_back"),
        "back_to_location_menu"
      ),
    ]);

    await ctx.editMessageText(
      "📋 Quyidagi joylashuvlardan birini tanlang:",
      Markup.inlineKeyboard(buttons)
    );
  } catch (error) {
    console.error("Error in manual_select:", error);
    await ctx.answerCbQuery("❌ Xatolik yuz berdi");
  }
});

// Handle top cities selection
locationScene.action("top_cities", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    // Get top 20 cities
    const cities = await getTopCities(20);

    if (!cities || cities.length === 0) {
      await ctx.editMessageText("⚠️ Shaharlar ro'yxati topilmadi");
      return;
    }

    // Build inline keyboard
    const buttons = [];
    for (const city of cities) {
      let cityName = city.name;
      if (lang === "uz") cityName = city.nameUz || city.name;
      else if (lang === "cr") cityName = city.nameCyrillic || city.name;
      else if (lang === "ru") cityName = city.nameRu || city.name;

      buttons.push([
        Markup.button.callback(`📍 ${cityName}`, `select_location_${city._id}`),
      ]);
    }

    buttons.push([
      Markup.button.callback("◀️ Orqaga", "back_to_location_menu"),
    ]);

    await ctx.editMessageText(
      "🏙️ Mashhur shaharlar:",
      Markup.inlineKeyboard(buttons)
    );
  } catch (error) {
    console.error("Error in top_cities:", error);
    await ctx.answerCbQuery("❌ Xatolik yuz berdi");
  }
});

// Handle region selection
locationScene.action("select_region", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    // Get all regions
    const regions = await getAllRegions();

    if (!regions || regions.length === 0) {
      await ctx.editMessageText("⚠️ Viloyatlar ro'yxati topilmadi");
      return;
    }

    // Build inline keyboard
    const buttons = [];
    for (const region of regions) {
      buttons.push([
        Markup.button.callback(
          `🗺️ ${region.region} (${region.cityCount})`,
          `region_${region.region}`
        ),
      ]);
    }

    buttons.push([
      Markup.button.callback("◀️ Orqaga", "back_to_location_menu"),
    ]);

    await ctx.editMessageText(
      "🗺️ Viloyatni tanlang:",
      Markup.inlineKeyboard(buttons)
    );
  } catch (error) {
    console.error("Error in select_region:", error);
    await ctx.answerCbQuery("❌ Xatolik yuz berdi");
  }
});

// Handle region cities
locationScene.action(/^region_(.+)$/, async (ctx) => {
  try {
    const regionName = ctx.match[1];
    await ctx.answerCbQuery();
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    // Get cities in this region
    const cities = await getCitiesByRegion(regionName);

    if (!cities || cities.length === 0) {
      await ctx.editMessageText("⚠️ Bu viloyatda shaharlar topilmadi");
      return;
    }

    // Build inline keyboard
    const buttons = [];
    for (const city of cities) {
      let cityName = city.name;
      if (lang === "uz") cityName = city.nameUz || city.name;
      else if (lang === "cr") cityName = city.nameCyrillic || city.name;
      else if (lang === "ru") cityName = city.nameRu || city.name;

      buttons.push([
        Markup.button.callback(`📍 ${cityName}`, `select_location_${city._id}`),
      ]);
    }

    buttons.push([
      Markup.button.callback("◀️ Viloyatlarga qaytish", "select_region"),
    ]);

    await ctx.editMessageText(
      `🏙️ ${regionName} shaharlari:`,
      Markup.inlineKeyboard(buttons)
    );
  } catch (error) {
    console.error("Error in region cities:", error);
    await ctx.answerCbQuery("❌ Xatolik yuz berdi");
  }
});

// Handle using nearest city
locationScene.action(/^use_nearest_(.+)$/, async (ctx) => {
  try {
    const locationId = ctx.match[1];
    await ctx.answerCbQuery();

    const location = await Location.findById(locationId);
    if (!location) {
      await ctx.reply("❌ Shahar topilmadi");
      return;
    }

    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    let locationName = location.name;
    if (lang === "uz") locationName = location.nameUz || location.name;
    else if (lang === "cr")
      locationName = location.nameCyrillic || location.name;
    else if (lang === "ru") locationName = location.nameRu || location.name;

    // Save nearest city
    await User.findOneAndUpdate(
      { userId: ctx.from.id },
      {
        location: {
          name: locationName,
          latitude: location.latitude,
          longitude: location.longitude,
          timezone: location.timezone || "Asia/Tashkent",
        },
      }
    );

    ctx.session.user.location = {
      name: locationName,
      latitude: location.latitude,
      longitude: location.longitude,
    };

    await ctx.editMessageText(
      `✅ Joylashuv saqlandi: ${locationName}\n` +
        `⚡️ Namoz vaqtlari tez yuklanadi!`
    );

    await ctx.reply(await t(lang, "main_menu"), {
      ...(await getMainMenuKeyboard(lang)),
    });

    await ctx.scene.leave();
  } catch (error) {
    console.error("Error using nearest city:", error);
    await ctx.answerCbQuery("❌ Xatolik yuz berdi");
  }
});

// Handle using GPS coordinates
locationScene.action("use_gps_coords", async (ctx) => {
  try {
    await ctx.answerCbQuery();

    const tempLoc = ctx.session.tempLocation;
    if (!tempLoc || !tempLoc.gps) {
      await ctx.reply("❌ GPS ma'lumotlari topilmadi");
      return;
    }

    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    // Save GPS coordinates
    await User.findOneAndUpdate(
      { userId: ctx.from.id },
      {
        location: {
          name: tempLoc.gps.name,
          latitude: tempLoc.gps.lat,
          longitude: tempLoc.gps.lon,
          timezone: "Asia/Tashkent",
        },
      }
    );

    ctx.session.user.location = {
      name: tempLoc.gps.name,
      latitude: tempLoc.gps.lat,
      longitude: tempLoc.gps.lon,
    };

    await ctx.editMessageText(
      `✅ Joylashuvingiz saqlandi!\n` + `📍 Aniq GPS koordinatalari saqlandı`
    );

    await ctx.reply(await t(lang, "main_menu"), {
      ...(await getMainMenuKeyboard(lang)),
    });

    await ctx.scene.leave();
  } catch (error) {
    console.error("Error using GPS coords:", error);
    await ctx.answerCbQuery("❌ Xatolik yuz berdi");
  }
});

// Handle back to location menu
locationScene.action("back_to_location_menu", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.scene.reenter();
  } catch (error) {
    console.error("Error going back:", error);
  }
});

// Handle location selection from list
locationScene.action(/^select_location_(.+)$/, async (ctx) => {
  try {
    const locationId = ctx.match[1];
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    const location = await Location.findById(locationId);

    if (!location) {
      await ctx.answerCbQuery("❌ Joylashuv topilmadi");
      return;
    }

    // Save selected location to user
    await User.findOneAndUpdate(
      { userId: ctx.from.id },
      {
        location: {
          name: location.name,
          latitude: location.latitude,
          longitude: location.longitude,
          timezone: location.timezone || "Asia/Tashkent",
        },
      }
    );

    ctx.session.user.location = {
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone || "Asia/Tashkent",
    };

    let locationName = location.name;
    if (lang === "uz") locationName = location.nameUz || location.name;
    else if (lang === "cr") locationName = location.nameCr || location.name;
    else if (lang === "ru") locationName = location.nameRu || location.name;

    await ctx.answerCbQuery("✅ Joylashuv saqlandi");

    // Delete the original message and send a new one to avoid editMessageText with keyboard issues
    try {
      await ctx.deleteMessage();
    } catch (e) {
      // Ignore if message already deleted
    }

    await ctx.reply(
      await t(lang, "location_saved", { location: locationName }),
      {
        ...(await getMainMenuKeyboard(lang)),
      }
    );

    await ctx.scene.leave();
  } catch (error) {
    console.error("Error selecting location:", error);
    await ctx.answerCbQuery("❌ Xatolik yuz berdi");
  }
});

// Handle GPS button click
locationScene.action("send_gps", async (ctx) => {
  try {
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    await ctx.answerCbQuery();

    const keyboard = Markup.keyboard([
      [Markup.button.locationRequest(await t(lang, "btn_send_gps"))],
      [Markup.button.text(await t(lang, "btn_cancel"))],
    ])
      .resize()
      .oneTime();

    await ctx.editMessageText(await t(lang, "send_gps_location"));
    await ctx.reply(await t(lang, "location_send"), keyboard);
  } catch (error) {
    console.error("Error in send_gps action:", error);
  }
});

// Handle GPS location
locationScene.on("location", async (ctx) => {
  try {
    const user = ctx.session.user;
    const lang = getUserLanguage(user);
    const location = ctx.message.location;

    await ctx.reply("⏳ Eng yaqin shaharni qidiryapman...");

    // Find nearest city from database
    const nearestResult = await findNearestCity(
      location.latitude,
      location.longitude,
      100
    );

    let locationName = "Tashkent"; // Default
    let finalLat = location.latitude;
    let finalLon = location.longitude;
    let useNearestCity = false;

    if (nearestResult && nearestResult.city) {
      const nearest = nearestResult.city;
      locationName = nearest.nameUz || nearest.name;

      // Show options: use nearest city or keep GPS coordinates
      const buttons = [
        [
          Markup.button.callback(
            `✅ ${locationName} (${nearest.distance} km)`,
            `use_nearest_${nearest._id}`
          ),
        ],
        [
          Markup.button.callback(
            "📍 GPS koordinatalarimni saqlash",
            "use_gps_coords"
          ),
        ],
      ];

      // Store data in session for later use
      ctx.session.tempLocation = {
        gps: {
          lat: location.latitude,
          lon: location.longitude,
          name: locationName,
        },
        nearest: {
          id: nearest._id,
          name: locationName,
          lat: nearest.latitude,
          lon: nearest.longitude,
          distance: nearest.distance,
        },
      };

      await ctx.reply(
        `📍 Sizning joylashuvingiz\n` +
          `🏙 Eng yaqin shahar: ${locationName}\n` +
          `📏 Masofa: ${nearest.distance} km\n\n` +
          `⚡️ Eng yaqin shaharni tanlash tavsiya etiladi - namoz vaqtlari tezroq yuklanadi.`,
        Markup.inlineKeyboard(buttons)
      );
      return;
    }

    // Fallback: reverse geocoding if no nearest city found
    try {
      const axios = require("axios");
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse`,
        {
          params: {
            lat: location.latitude,
            lon: location.longitude,
            format: "json",
            "accept-language": "en",
          },
          headers: {
            "User-Agent": "RamazonBot/1.0",
          },
        }
      );

      if (response.data && response.data.address) {
        const address = response.data.address;
        locationName =
          address.city ||
          address.town ||
          address.village ||
          address.state ||
          "Tashkent";
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error.message);
    }

    // Save GPS coordinates
    await User.findOneAndUpdate(
      { userId: ctx.from.id },
      {
        location: {
          name: locationName,
          latitude: location.latitude,
          longitude: location.longitude,
          timezone: "Asia/Tashkent",
        },
      }
    );

    ctx.session.user.location = {
      name: locationName,
      latitude: location.latitude,
      longitude: location.longitude,
    };

    await ctx.reply(
      await t(lang, "location_detected", { location: locationName }),
      {
        ...(await getMainMenuKeyboard(lang)),
      }
    );

    await ctx.scene.leave();
  } catch (error) {
    console.error("Error handling location:", error);
    const lang = getUserLanguage(ctx.session.user);
    await ctx.reply(await t(lang, "location_error"));
  }
});

// Back to menu handler
locationScene.action("back_to_menu", async (ctx) => {
  const lang = getUserLanguage(ctx.session.user);
  await ctx.answerCbQuery();
  await ctx.deleteMessage();
  await ctx.reply(await t(lang, "main_menu"), {
    ...(await getMainMenuKeyboard(lang)),
  });
  await ctx.scene.leave();
});

// Cancel handler
locationScene.action("cancel_location", async (ctx) => {
  const lang = getUserLanguage(ctx.session.user);
  await ctx.answerCbQuery();
  await ctx.deleteMessage();
  await ctx.reply(await t(lang, "main_menu"), {
    ...(await getMainMenuKeyboard(lang)),
  });
  await ctx.scene.leave();
});

// Back to menu handler
locationScene.action("back_to_menu", async (ctx) => {
  try {
    const lang = getUserLanguage(ctx.session.user);
    await ctx.answerCbQuery();

    try {
      await ctx.deleteMessage();
    } catch (e) {
      // Ignore if message already deleted
    }

    await ctx.reply(await t(lang, "main_menu"), {
      ...(await getMainMenuKeyboard(lang)),
    });
    await ctx.scene.leave();
  } catch (error) {
    console.error("Error in back_to_menu:", error);
  }
});

locationScene.hears(/❌|Bekor|Отмена|Cancel/, async (ctx) => {
  const lang = getUserLanguage(ctx.session.user);
  await ctx.reply(await t(lang, "main_menu"), {
    ...(await getMainMenuKeyboard(lang)),
  });
  await ctx.scene.leave();
});

// Handle search by name
locationScene.on("text", async (ctx) => {
  try {
    const query = ctx.message.text;
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    // Filter out menu/back buttons
    if (
      query.startsWith("/") ||
      query.includes("Orqaga") ||
      query.includes("Back") ||
      query.includes("Назад") ||
      query.includes("Bekor") ||
      query.includes("Отмена") ||
      query.includes("Cancel")
    ) {
      if (!query.startsWith("/")) {
        await ctx.reply(
          await t(lang, "main_menu"),
          await getMainMenuKeyboard(lang)
        );
        return await ctx.scene.leave();
      }
      return;
    }

    const results = await searchCities(query, 10);

    if (results.length === 0) {
      await ctx.reply(
        lang === "ru"
          ? "❓ Город не найден. Попробуйте ввести другое название или выберите из списка."
          : "❓ Shahar topilmadi. Boshqa nom kiritib ko'ring yoki ro'yxatdan tanlang."
      );
      return;
    }

    const buttons = results.map((city) => {
      let cityName = city.nameUz || city.name;
      if (lang === "cr") cityName = city.nameCyrillic || city.name;
      if (lang === "ru") cityName = city.nameRu || city.name;

      return [
        Markup.button.callback(
          `📍 ${cityName} (${city.region})`,
          `select_location_${city._id}`
        ),
      ];
    });

    buttons.push([
      Markup.button.callback("◀️ Orqaga", "back_to_location_menu"),
    ]);

    await ctx.reply(
      lang === "ru" ? "🔍 Результаты поиска:" : "🔍 Qidiruv natijalari:",
      Markup.inlineKeyboard(buttons)
    );
  } catch (error) {
    console.error("Error in location search:", error);
  }
});

// Handle any command - leave scene
locationScene.command(
  () => true,
  async (ctx) => {
    await ctx.scene.leave();
  }
);

locationScene.hears(/◀️|Орқага|Назад/, async (ctx) => {
  const user = ctx.session.user;
  const lang = getUserLanguage(user);

  await ctx.reply(await t(lang, "main_menu"), {
    ...(await getMainMenuKeyboard(lang)),
  });

  await ctx.scene.leave();
});

module.exports = locationScene;
