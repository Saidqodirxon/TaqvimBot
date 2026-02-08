const Settings = require("../models/Settings");
const { t } = require("./translator");
const logger = require("./logger");

/**
 * Foydalanuvchi kanalga obuna bo'lganligini tekshirish (multiple channels)
 * @param {boolean} returnOnly - If true, only return status without sending messages
 */
async function checkChannelMembership(ctx, next, returnOnly = false) {
  try {
    // Basic safety check for context
    if (!ctx || !ctx.from) {
      return returnOnly ? true : next();
    }

    // Get channels from Settings
    const channels = await Settings.getSetting("channels", []);

    // Filter only active channels
    const activeChannels = channels.filter((ch) => ch.isActive === true);

    // If no active channels, skip check
    if (activeChannels.length === 0) {
      return returnOnly ? true : next();
    }

    // Check if user is within delay period
    const delaySettings = await Settings.getSetting("channel_join_delay", {
      days: 0,
      hours: 0,
    });

    const user = ctx.session?.user;
    if (user && user.delayStartedAt) {
      const now = new Date();
      const delayStartTime = new Date(user.delayStartedAt);
      const delayMs =
        Number(delaySettings.days || 0) * 24 * 60 * 60 * 1000 +
        Number(delaySettings.hours || 0) * 60 * 60 * 1000;
      const timeSinceDelayStarted = now - delayStartTime;

      // If user is within delay period, skip channel check
      if (timeSinceDelayStarted < delayMs) {
        return returnOnly ? true : next();
      }
    }

    const userId = ctx.from.id;
    const lang = ctx.session?.user?.language || "uz";
    const notJoinedChannels = [];

    // Check membership for each active channel (with timeout)
    for (const channel of activeChannels) {
      if (!channel.id) continue;

      try {
        const member = await Promise.race([
          ctx.telegram.getChatMember(channel.id, userId),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 2000)
          ),
        ]);

        // Status: creator, administrator, member - joined
        if (!["creator", "administrator", "member"].includes(member.status)) {
          notJoinedChannels.push(channel);
        }
      } catch (error) {
        // If bot is blocked by user (403), skip this channel check
        if (
          error.response?.error_code === 403 ||
          error.message.includes("bot was blocked")
        ) {
          continue;
        }

        // On timeout or other errors (like 400: chat not found), flag as not joined
        // as we can't verify membership
        console.error(
          `Kanal tekshirishda xato (${channel.username || channel.id}):`,
          error.message
        );
        notJoinedChannels.push(channel);
      }
    }

    // If user joined all active channels
    if (notJoinedChannels.length === 0) {
      if (ctx.session?.user) {
        ctx.session.user.hasJoinedChannel = true;
      }
      return returnOnly ? true : next();
    }

    // If returnOnly mode, just return false
    if (returnOnly) {
      return false;
    }

    // User hasn't joined some channels - log it safely
    try {
      if (logger.logChannelCheckFailed) {
        await logger.logChannelCheckFailed(
          ctx.from,
          notJoinedChannels
            .map((ch) => ch.username || ch.title || ch.id)
            .join(", ")
        );
      }
    } catch (logErr) {
      console.error("Logger error in membership check:", logErr);
    }

    const message = await t(lang, "must_join_channels");

    // Build inline keyboard with all channels
    const channelButtons = notJoinedChannels
      .map((channel) => {
        const url =
          channel.url ||
          (channel.username
            ? `https://t.me/${channel.username.replace("@", "")}`
            : null);
        if (!url) return null;

        return [
          {
            text: `📢 ${channel.title || channel.username || "Kanalga o'tish"}`,
            url: url,
          },
        ];
      })
      .filter(Boolean);

    channelButtons.push([
      {
        text: await t(lang, "check_subscription"),
        callback_data: "check_subscription",
      },
    ]);

    await ctx.reply(message, {
      reply_markup: {
        inline_keyboard: channelButtons,
      },
    });
  } catch (error) {
    console.error("Middleware checkChannelMembership xatosi:", error);
    if (logger && logger.logError) {
      await logger.logError(error, "Channel membership check middleware");
    }
    return next();
  }
}

/**
 * Check subscription callback handler (multiple channels)
 */
async function handleCheckSubscription(ctx) {
  try {
    if (!ctx || !ctx.from) return;

    const channels = await Settings.getSetting("channels", []);
    const activeChannels = channels.filter((ch) => ch.isActive === true);

    if (activeChannels.length === 0) {
      await ctx.answerCbQuery("✅ Kanalga obuna shart emas").catch(() => {});
      return;
    }

    const userId = ctx.from.id;
    const lang = ctx.session?.user?.language || "uz";
    const notJoinedChannels = [];

    // Check all active channels
    for (const channel of activeChannels) {
      if (!channel.id) continue;

      try {
        const member = await ctx.telegram.getChatMember(channel.id, userId);

        if (!["creator", "administrator", "member"].includes(member.status)) {
          notJoinedChannels.push(channel);
        }
      } catch (error) {
        console.error(
          `Kanal tekshirishda xato (${channel.username || channel.id}):`,
          error.message
        );
        notJoinedChannels.push(channel);
      }
    }

    // If joined all channels
    if (notJoinedChannels.length === 0) {
      await ctx
        .answerCbQuery("✅ Barcha kanallarga obuna tasdiqlandi!")
        .catch(() => {});

      // Update user data in database AND session
      const User = require("../models/User");
      await User.updateOne(
        { userId },
        { $set: { hasJoinedChannel: true } }
      ).catch(() => {});

      if (ctx.session?.user) {
        ctx.session.user.hasJoinedChannel = true;
      }

      // Edit message to show success
      try {
        await ctx.editMessageText(await t(lang, "welcome_after_join"));
      } catch (e) {
        // Message might be too old or not changed, try sending new one
        await ctx.reply(await t(lang, "welcome_after_join")).catch(() => {});
      }

      // Show main menu
      const {
        getPhoneRequestKeyboard,
        getMainMenuKeyboard,
      } = require("./keyboards");

      try {
        const keyboard = await getMainMenuKeyboard(lang);
        await ctx.reply(await t(lang, "main_menu"), keyboard);
      } catch (menuErr) {
        console.error("Error sending main menu after join:", menuErr);
      }

      // If phone not provided, show request separately (non-blocking)
      if (!ctx.session?.user?.phoneNumber) {
        setTimeout(async () => {
          try {
            const phoneKeyboard = await getPhoneRequestKeyboard(lang);
            await ctx.telegram.sendMessage(
              userId,
              await t(lang, "request_phone"),
              phoneKeyboard
            );
          } catch (e) {
            console.error("Error sending phone request:", e.message);
          }
        }, 800);
      }
    } else {
      // Still not joined all channels
      const channelNames = notJoinedChannels
        .map((ch) => ch.title || ch.username || ch.id)
        .join(", ");

      await ctx
        .answerCbQuery(`❌ Hali obuna bo'lmagan kanallar: ${channelNames}`, {
          show_alert: true,
        })
        .catch(() => {});
    }
  } catch (err) {
    console.error("Error in handleCheckSubscription:", err);
    if (logger && logger.logError) {
      await logger.logError(err, "handleCheckSubscription");
    }
  }
}

module.exports = {
  checkChannelMembership,
  handleCheckSubscription,
};
