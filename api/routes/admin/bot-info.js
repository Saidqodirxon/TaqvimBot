const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../middleware/adminAuth");
const axios = require("axios");

/**
 * Get current bot information
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const token = process.env.BOT_TOKEN;

    if (!token) {
      return res.status(500).json({ error: "Bot token not configured" });
    }

    // Get bot info from Telegram API
    const response = await axios.get(
      `https://api.telegram.org/bot${token}/getMe`
    );

    if (response.data.ok) {
      const bot = response.data.result;

      // Extract bot ID from token
      const botId = token.split(":")[0];

      // Determine which bot is active
      const knownBots = {
        5255026450: {
          name: "RamazonCalendarBot",
          description: "RAMAZON TAQVIMI 2026🌙 | BETA",
          purpose: "Testing & Development",
        },
        6209529595: {
          name: "RealCoderUzBot",
          description: "Production Bot",
          purpose: "Live Production",
        },
      };

      const botInfo = knownBots[botId] || {
        name: "Unknown Bot",
        description: "Custom Configuration",
        purpose: "Unknown",
      };

      res.json({
        bot: {
          id: bot.id,
          username: bot.username,
          firstName: bot.first_name,
          canJoinGroups: bot.can_join_groups,
          canReadMessages: bot.can_read_all_group_messages,
          supportsInline: bot.supports_inline_queries,
        },
        config: {
          ...botInfo,
          isProduction: botId === "6209529595",
          isBeta: botId === "5255026450",
        },
        token: {
          id: botId,
          preview:
            token.substring(0, 20) + "..." + token.substring(token.length - 10),
        },
      });
    } else {
      res.status(500).json({ error: "Failed to fetch bot info" });
    }
  } catch (error) {
    console.error("Get bot info error:", error);
    res.status(500).json({
      error: "Server error",
      details: error.message,
    });
  }
});

module.exports = router;
