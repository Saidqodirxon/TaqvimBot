const { Scenes, Markup } = require("telegraf");
const { t, getUserLanguage } = require("../utils/translator");
const { getMainMenuKeyboard } = require("../utils/keyboards");
const Suggestion = require("../models/Suggestion");

// Suggestion Scene
const suggestionScene = new Scenes.BaseScene("suggestion");

suggestionScene.enter(async (ctx) => {
  const user = ctx.session.user;
  const lang = getUserLanguage(user);

  const keyboard = Markup.keyboard([[await t(lang, "btn_cancel")]]).resize();

  await ctx.reply(await t(lang, "suggestion_send"), keyboard);
});

// Handle any command - leave scene
suggestionScene.command(
  () => true,
  async (ctx) => {
    await ctx.scene.leave();
  }
);

suggestionScene.on("text", async (ctx) => {
  try {
    const suggestion = ctx.message.text;

    // Check if message is a command
    if (suggestion.startsWith("/")) {
      await ctx.scene.leave();
      return; // Let the command handler process it
    }

    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    // Check if user wants to cancel
    const cancelTexts = [
      await t(lang, "btn_cancel"),
      await t(lang, "btn_back"),
      await t(lang, "btn_back_menu"),
      "❌ Bekor qilish",
      "❌ Отмена",
    ];

    if (cancelTexts.includes(suggestion)) {
      await ctx.reply(await t(lang, "main_menu"), {
        ...(await getMainMenuKeyboard(lang)),
      });
      return await ctx.scene.leave();
    }

    // Save to database
    await Suggestion.create({
      userId: ctx.from.id,
      text: suggestion,
      status: "pending",
    });

    // Send to admin
    const adminId = process.env.ADMIN_ID;
    if (adminId) {
      await ctx.telegram.sendMessage(
        adminId,
        `💡 Yangi taklif:\n\n👤 ${ctx.from.first_name} (@${
          ctx.from.username || "yo'q"
        })\n🆔 ${ctx.from.id}\n\n${suggestion}`,
        { parse_mode: "HTML" }
      );
    }

    await ctx.reply(await t(lang, "suggestion_sent"), {
      ...(await getMainMenuKeyboard(lang)),
    });

    await ctx.scene.leave();
  } catch (error) {
    console.error("Error in suggestion scene:", error);
    const lang = getUserLanguage(ctx.session.user);
    await ctx.reply(await t(lang, "error_try_again"));
  }
});

module.exports = suggestionScene;
