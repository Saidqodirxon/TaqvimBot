const express = require("express");
const router = express.Router();
const Settings = require("../../models/Settings");
const logger = require("../../utils/logger");

/**
 * Get channels configuration
 */
router.get("/", async (req, res) => {
  try {
    const channels = await Settings.getSetting("channels", []);
    res.json(channels);
  } catch (error) {
    console.error("Error fetching channels:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Update channels configuration
 */
router.post("/", async (req, res) => {
  try {
    const { channels } = req.body;

    // Validate channels array
    if (!Array.isArray(channels)) {
      return res.status(400).json({ error: "Channels must be an array" });
    }

    // Validate each channel
    for (const channel of channels) {
      if (!channel.username || !channel.id) {
        return res
          .status(400)
          .json({ error: "Each channel must have username and id" });
      }
    }

    await Settings.setSetting(
      "channels",
      channels,
      "Majburiy a'zolik kanallari"
    );

    // Log admin action
    await logger.logAdminAction(
      { userId: req.user?.id || "system", firstName: "Admin" },
      "Kanallar yangilandi",
      `${channels.length} ta kanal saqlandi`
    );

    res.json({ success: true, channels });
  } catch (error) {
    console.error("Error updating channels:", error);
    await logger.logError(error, "Channel update failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Toggle channel active status
 */
router.patch("/:index/toggle", async (req, res) => {
  try {
    const { index } = req.params;
    const channels = await Settings.getSetting("channels", []);

    if (!channels[index]) {
      return res.status(404).json({ error: "Channel not found" });
    }

    channels[index].isActive = !channels[index].isActive;
    await Settings.setSetting("channels", channels);

    await logger.logAdminAction(
      { userId: req.user?.id || "system", firstName: "Admin" },
      "Kanal holati o'zgartirildi",
      `@${channels[index].username}: ${
        channels[index].isActive ? "Faollashtirildi" : "O'chirildi"
      }`
    );

    res.json({ success: true, channel: channels[index] });
  } catch (error) {
    console.error("Error toggling channel:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
