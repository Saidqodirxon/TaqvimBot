const Settings = require("../models/Settings");
const { t } = require("./translator");
const logger = require("./logger");

/**
 * Foydalanuvchi kanalga obuna bo'lganligini tekshirish (multiple channels)
 */
async function checkChannelMembership(ctx, next) {
  try {
    // Get channels from Settings
    const channels = await Settings.getSetting("channels", []);

    // Filter only active channels
    const activeChannels = channels.filter((ch) => ch.isActive === true);

    // If no active channels, skip check
    if (activeChannels.length === 0) {
      return next();
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
        return next();
      }
    }

    const userId = ctx.from.id;
    const lang = ctx.session?.user?.language || "uz";
    const notJoinedChannels = [];

    // Check membership for each active channel
    for (const channel of activeChannels) {
      try {
        const member = await ctx.telegram.getChatMember(channel.id, userId);

        // Status: creator, administrator, member - obuna bo'lgan
        if (!["creator", "administrator", "member"].includes(member.status)) {
          notJoinedChannels.push(channel);
        }
      } catch (error) {
        console.error(
          `Kanal tekshirishda xato (${channel.username}):`,
          error.message
        );
        // If error checking channel, add to not joined list
        notJoinedChannels.push(channel);
      }
    }

    // If user joined all active channels
    if (notJoinedChannels.length === 0) {
      if (ctx.session?.user) {
        ctx.session.user.hasJoinedChannel = true;
      }
      return next();
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
        text: t(lang, "check_subscription"),
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

    // Update user data
    if (ctx.session?.user) {
      ctx.session.user.hasJoinedChannel = true;
    }

    await ctx.editMessageText(await t(lang, "welcome_after_join"));

    // Check if phone number is provided
    const {
      getPhoneRequestKeyboard,
      getMainMenuKeyboard,
    } = require("./keyboards");
    if (!ctx.session?.user?.phoneNumber) {
      // Request phone number
      await ctx.reply(await t(lang, "request_phone"), await getPhoneRequestKeyboard(lang));
    } else {
      // Show main menu
      await ctx.reply(await t(lang, "main_menu"), await getMainMenuKeyboard(lang));
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
