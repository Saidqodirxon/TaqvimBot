const { Scenes, Markup } = require("telegraf");
const { t, getUserLanguage } = require("../utils/translator");
const { getMainMenuKeyboard } = require("../utils/keyboards");
const User = require("../models/User");
const Location = require("../models/Location");

// Location Scene
const locationScene = new Scenes.BaseScene("location");

locationScene.enter(async (ctx) => {
  try {
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    // Show two main options: GPS or Manual selection
    const buttons = [
      [Markup.button.callback(await t(lang, "btn_gps_location"), "send_gps")],
      [
        Markup.button.callback(
          await t(lang, "btn_manual_select"),
          "manual_select"
        ),
      ],
      [Markup.button.callback(await t(lang, "btn_back_menu"), "back_to_menu")],
    ];

    await ctx.reply(
      await t(lang, "select_location_method"),
      Markup.inlineKeyboard(buttons)
    );
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

    // Reverse geocoding - GPS koordinatalardan shahar aniqlash
    const axios = require("axios");
    let locationName = "Tashkent"; // Default

    try {
      // Nominatim API orqali shahar nomini aniqlash
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

    // Foydalanuvchi joylashuvini saqlash
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
  await ctx.reply(t(lang, "main_menu"), {
    ...getMainMenuKeyboard(lang),
  });
  await ctx.scene.leave();
});

// Cancel handler
locationScene.action("cancel_location", async (ctx) => {
  const lang = getUserLanguage(ctx.session.user);
  await ctx.answerCbQuery();
  await ctx.deleteMessage();
  await ctx.reply(t(lang, "main_menu"), {
    ...getMainMenuKeyboard(lang),
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

    await ctx.reply(t(lang, "main_menu"), {
      ...getMainMenuKeyboard(lang),
    });
    await ctx.scene.leave();
  } catch (error) {
    console.error("Error in back_to_menu:", error);
  }
});

locationScene.hears(/❌|Bekor|Отмена|Cancel/, async (ctx) => {
  const lang = getUserLanguage(ctx.session.user);
  await ctx.reply(t(lang, "main_menu"), {
    ...getMainMenuKeyboard(lang),
  });
  await ctx.scene.leave();
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

  await ctx.reply(t(lang, "main_menu"), {
    ...getMainMenuKeyboard(lang),
  });

  await ctx.scene.leave();
});

module.exports = locationScene;
