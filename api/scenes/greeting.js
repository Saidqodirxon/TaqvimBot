const { Scenes } = require("telegraf");
const { t, getUserLanguage } = require("../utils/translator");
const {
  getConfirmKeyboard,
  getMainMenuKeyboard,
} = require("../utils/keyboards");
const { saveGreeting } = require("../utils/database");

// Greeting Scene - for sending greetings
const greetingScene = new Scenes.BaseScene("greeting");

greetingScene.enter(async (ctx) => {
  const user = ctx.session.user;
  const lang = getUserLanguage(user);

  await ctx.reply(t(lang, "greeting_send"), {
    parse_mode: "HTML",
    reply_markup: {
      keyboard: [[{ text: t(lang, "btn_back_menu") }]],
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  });
});

// Handle any command - leave scene
greetingScene.command(
  () => true,
  async (ctx) => {
    await ctx.scene.leave();
  }
);

greetingScene.on("text", async (ctx) => {
  try {
    const message = ctx.message.text;
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    // Check if user wants to go back
    if (
      message === t(lang, "btn_back_menu") ||
      message === t(lang, "btn_back") ||
      message === t(lang, "btn_cancel")
    ) {
      await ctx.reply(t(lang, "main_menu"), {
        parse_mode: "HTML",
        ...getMainMenuKeyboard(lang),
      });
      return await ctx.scene.leave();
    }

    // Check if message is a command
    if (message.startsWith("/")) {
      await ctx.scene.leave();
      return; // Let the command handler process it
    }

    // Store message in session
    ctx.session.greetingData = {
      type: "text",
      message,
      userId: ctx.from.id,
      firstName: ctx.from.first_name,
      username: ctx.from.username,
    };

    await ctx.reply(`${t(lang, "greeting_confirm")}\n\n${message}`, {
      parse_mode: "HTML",
      ...getConfirmKeyboard(lang),
    });
  } catch (error) {
    console.error("Error in greeting scene text:", error);
    const lang = getUserLanguage(ctx.session.user);
    await ctx.reply(t(lang, "error_try_again"));
  }
});

greetingScene.on("photo", async (ctx) => {
  try {
    const user = ctx.session.user;
    const lang = getUserLanguage(user);
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const caption = ctx.message.caption || "";

    ctx.session.greetingData = {
      type: "photo",
      fileId: photo.file_id,
      caption,
      userId: ctx.from.id,
      firstName: ctx.from.first_name,
      username: ctx.from.username,
    };

    await ctx.replyWithPhoto(photo.file_id, {
      caption: `${t(lang, "greeting_confirm")}\n\n${caption}`,
      ...getConfirmKeyboard(lang),
    });
  } catch (error) {
    console.error("Error in greeting scene photo:", error);
    const lang = getUserLanguage(ctx.session.user);
    await ctx.reply(t(lang, "error_try_again"));
  }
});

greetingScene.on("video", async (ctx) => {
  try {
    const user = ctx.session.user;
    const lang = getUserLanguage(user);
    const video = ctx.message.video;
    const caption = ctx.message.caption || "";

    ctx.session.greetingData = {
      type: "video",
      fileId: video.file_id,
      caption,
      userId: ctx.from.id,
      firstName: ctx.from.first_name,
      username: ctx.from.username,
    };

    await ctx.replyWithVideo(video.file_id, {
      caption: `${t(lang, "greeting_confirm")}\n\n${caption}`,
      ...getConfirmKeyboard(lang),
    });
  } catch (error) {
    console.error("Error in greeting scene video:", error);
    const lang = getUserLanguage(ctx.session.user);
    await ctx.reply(t(lang, "error_try_again"));
  }
});

greetingScene.action("confirm", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const user = ctx.session.user;
    const lang = getUserLanguage(user);
    const greetingData = ctx.session.greetingData;

    if (!greetingData) {
      await ctx.reply(t(lang, "error_try_again"));
      return await ctx.scene.leave();
    }

    // Save to database
    const greeting = await saveGreeting({
      userId: greetingData.userId,
      firstName: greetingData.firstName,
      username: greetingData.username,
      message: greetingData.message || greetingData.caption || "",
      messageType: greetingData.type,
      fileId: greetingData.fileId || null,
      caption: greetingData.caption || null,
      status: "pending",
    });

    // Notify admin
    const adminId = process.env.ADMIN_ID;
    const botUser = process.env.BOT_USER;

    if (adminId) {
      const adminMessage = `💌 Yangi tabrik:\n\n👤 ${
        greetingData.firstName
      } (@${greetingData.username || "yo'q"})\n🆔 ${greetingData.userId}\n\n${
        greetingData.message || greetingData.caption || ""
      }`;

      if (greetingData.type === "photo") {
        await ctx.telegram.sendPhoto(adminId, greetingData.fileId, {
          caption: adminMessage,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✅ Tasdiqlash",
                  callback_data: `approve_${greeting._id}`,
                },
                {
                  text: "❌ Rad etish",
                  callback_data: `reject_${greeting._id}`,
                },
              ],
            ],
          },
        });
      } else if (greetingData.type === "video") {
        await ctx.telegram.sendVideo(adminId, greetingData.fileId, {
          caption: adminMessage,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✅ Tasdiqlash",
                  callback_data: `approve_${greeting._id}`,
                },
                {
                  text: "❌ Rad etish",
                  callback_data: `reject_${greeting._id}`,
                },
              ],
            ],
          },
        });
      } else {
        await ctx.telegram.sendMessage(adminId, adminMessage, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✅ Tasdiqlash",
                  callback_data: `approve_${greeting._id}`,
                },
                {
                  text: "❌ Rad etish",
                  callback_data: `reject_${greeting._id}`,
                },
              ],
            ],
          },
        });
      }
    }

    // Delete the inline keyboard message and send success message
    try {
      await ctx.deleteMessage();
    } catch (e) {
      // Ignore if message can't be deleted
    }

    await ctx.reply(t(lang, "greeting_sent_admin"), {
      parse_mode: "HTML",
    });

    await ctx.reply(t(lang, "main_menu"), {
      parse_mode: "HTML",
      ...getMainMenuKeyboard(lang),
    });

    await ctx.scene.leave();
  } catch (error) {
    console.error("Error confirming greeting:", error);
    const lang = getUserLanguage(ctx.session.user);
    await ctx.reply(t(lang, "error_try_again"));
  }
});

greetingScene.action("reject", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const user = ctx.session.user;
    const lang = getUserLanguage(user);

    // Delete the confirmation message
    try {
      await ctx.deleteMessage();
    } catch (e) {
      // Ignore if message can't be deleted
    }

    await ctx.reply(t(lang, "main_menu"), {
      parse_mode: "HTML",
      ...getMainMenuKeyboard(lang),
    });

    await ctx.scene.leave();
  } catch (error) {
    console.error("Error in reject action:", error);
  }
});

module.exports = greetingScene;
