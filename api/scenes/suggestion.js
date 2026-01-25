const { Scenes } = require("telegraf");
const { t, getUserLanguage } = require("../utils/translator");
const { getMainMenuKeyboard } = require("../utils/keyboards");
const Suggestion = require("../models/Suggestion");

// Suggestion Scene
const suggestionScene = new Scenes.BaseScene("suggestion");

suggestionScene.enter(async (ctx) => {
  const user = ctx.session.user;
  const lang = getUserLanguage(user);

  await ctx.reply(t(lang, "suggestion_send"), {
    reply_markup: { remove_keyboard: true },
  });
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

    await ctx.reply(t(lang, "suggestion_sent"), {
      ...getMainMenuKeyboard(lang),
    });

    await ctx.scene.leave();
  } catch (error) {
    console.error("Error in suggestion scene:", error);
    const lang = getUserLanguage(ctx.session.user);
    await ctx.reply(t(lang, "error_try_again"));
  }
});

module.exports = suggestionScene;
