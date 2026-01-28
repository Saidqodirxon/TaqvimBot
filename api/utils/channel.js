const Settings = require("../models/Settings");
const { t } = require("./translator");
const logger = require("./logger");

/**
 * Foydalanuvchi kanalga obuna bo'lganligini tekshirish (multiple channels)
 * @param {boolean} returnOnly - If true, only return status without sending messages
 */
async function checkChannelMembership(ctx, next, returnOnly = false) {
  try {
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
    if (user && user.createdAt) {
      const now = new Date();
      const userCreatedAt = new Date(user.createdAt);
      const delayMs =
        delaySettings.days * 24 * 60 * 60 * 1000 +
        delaySettings.hours * 60 * 60 * 1000;
      const timeSinceCreation = now - userCreatedAt;

      // If user is within delay period, skip channel check
      if (timeSinceCreation < delayMs) {
        return returnOnly ? true : next();
      }
    }

    const userId = ctx.from.id;
    const lang = ctx.session?.user?.language || "uz";
    const notJoinedChannels = [];

    // Check membership for each active channel (with timeout)
    for (const channel of activeChannels) {
      try {
        const member = await Promise.race([
          ctx.telegram.getChatMember(channel.id, userId),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 2000)
          ),
        ]);

        // Status: creator, administrator, member - obuna bo'lgan
        if (!["creator", "administrator", "member"].includes(member.status)) {
          notJoinedChannels.push(channel);
        }
      } catch (error) {
        // If bot is blocked by user (403), skip this channel check
        if (
          error.response?.error_code === 403 ||
          error.message.includes("bot was blocked")
        ) {
          console.log(
            `User ${userId} has blocked the bot, skipping channel check`
          );
          continue; // Skip this channel, don't add to notJoinedChannels
        }

        // On timeout or other errors, assume not joined
        console.error(
          `Kanal tekshirishda xato (${channel.username}):`,
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

    // User hasn't joined some channels - show them
    await logger.logChannelCheckFailed(
      ctx.from,
      notJoinedChannels.map((ch) => ch.username).join(", ")
    );

    const message = await t(lang, "must_join_channels");

    // Build inline keyboard with all channels
    const channelButtons = notJoinedChannels.map((channel) => [
      {
        text: `📢 ${channel.title || channel.username}`,
        url: `https://t.me/${channel.username}`,
      },
    ]);

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
    console.error("Middleware xatosi:", error);
    await logger.logError(error, "Channel membership check");
    return next();
  }
}

/**
 * Check subscription callback handler (multiple channels)
 */
async function handleCheckSubscription(ctx) {
  const channels = await Settings.getSetting("channels", []);
  const activeChannels = channels.filter((ch) => ch.isActive === true);

  if (activeChannels.length === 0) {
    await ctx.answerCbQuery("✅ Kanalga obuna shart emas");
    return;
  }

  const userId = ctx.from.id;
  const lang = ctx.session?.user?.language || "uz";
  const notJoinedChannels = [];

  // Check all active channels
  for (const channel of activeChannels) {
    try {
      const member = await ctx.telegram.getChatMember(channel.id, userId);

      if (!["creator", "administrator", "member"].includes(member.status)) {
        notJoinedChannels.push(channel);
      }
    } catch (error) {
      console.error(
        `Kanal tekshirishda xato (${channel.username}):`,
        error.message
      );
      notJoinedChannels.push(channel);
    }
  }

  // If joined all channels
  if (notJoinedChannels.length === 0) {
    await ctx.answerCbQuery("✅ Barcha kanallarga obuna tasdiqlandi!");

    // Update user data in database AND session
    const User = require("../models/User");
    await User.updateOne(
      { userId },
      { $set: { hasJoinedChannel: true } }
    );
    
    if (ctx.session?.user) {
      ctx.session.user.hasJoinedChannel = true;
    }

    // Edit message to show success
    try {
      await ctx.editMessageText(await t(lang, "welcome_after_join"));
    } catch (e) {
      // Message might be too old, send new one
      await ctx.reply(await t(lang, "welcome_after_join"));
    }

    // Show main menu IMMEDIATELY (don't block on phone request)
    const {
      getPhoneRequestKeyboard,
      getMainMenuKeyboard,
    } = require("./keyboards");
    
    // Always show main menu
    await ctx.reply(
      await t(lang, "main_menu"),
      await getMainMenuKeyboard(lang)
    );
    
    // If phone not provided, show request separately (non-blocking)
    if (!ctx.session?.user?.phoneNumber) {
      setTimeout(async () => {
        try {
          await ctx.telegram.sendMessage(
            userId,
            await t(lang, "request_phone"),
            await getPhoneRequestKeyboard(lang)
          );
        } catch (e) {
          console.error("Error sending phone request:", e.message);
        }
      }, 500);
    }
  } else {
    // Still not joined all channels
    const channelNames = notJoinedChannels
      .map((ch) => ch.title || ch.username)
      .join(", ");
    await ctx.answerCbQuery(
      `❌ Hali obuna bo'lmagan kanallar: ${channelNames}`,
      {
        show_alert: true,
      }
    );
  }
}

module.exports = {
  checkChannelMembership,
  handleCheckSubscription,
};
