const logger = require("../../utils/logger");
const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../middleware/adminAuth");
const Greeting = require("../../models/Greeting");
const Settings = require("../../models/Settings");
const axios = require("axios");

// Get all greetings
router.get("/", authMiddleware, async (req, res) => {
  try {
    if (require("mongoose").connection.readyState !== 1) {
      return res.status(503).json({ error: "Database not connected" });
    }
    const { status } = req.query;
    const filter = status ? { status } : {};
    const greetings = await Greeting.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .maxTimeMS(10000);
    res.json({ greetings });
  } catch (error) {
    logger.error("Get greetings error:", error);
    if (
      error.message &&
      (error.message.includes("timed out") ||
        error.message.includes("buffering"))
    ) {
      return res.status(408).json({ error: "Database timeout" });
    }

    res.status(500).json({ error: "Server xatosi", details: error.message });
  }
});
// Approve greeting
router.patch("/:id/approve", authMiddleware, async (req, res) => {
  try {
    const greeting = await Greeting.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );
    if (!greeting) {
      return res.status(404).json({ error: "Tabrik topilmadi" });
    }

    // Send to greeting channel
    try {
      const greetingChannel = await Settings.getSetting("greeting_channel", null);
      if (greetingChannel) {
        const botToken = process.env.BOT_TOKEN;
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        
        await axios.post(url, {
          chat_id: greetingChannel,
          text: `📨 Yangi Tabrik!\n\n${greeting.text}\n\n👤 Yuboruvchi: ${greeting.userId}`,
          parse_mode: "HTML",
        });

        await logger.info(`Tabrik kanalga yuborildi: ${greeting._id}`);
      }
    } catch (channelError) {
      logger.error("Greeting channel send error:", channelError);
      // Continue even if channel send fails
    }

    res.json({ message: "Tabrik tasdiqlandi", greeting });
  } catch (error) {
    logger.error("Approve greeting error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Reject greeting
router.patch("/:id/reject", authMiddleware, async (req, res) => {
  try {
    const greeting = await Greeting.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );

    if (!greeting) {
      return res.status(404).json({ error: "Tabrik topilmadi" });
    }

    res.json({ message: "Tabrik rad etildi", greeting });
  } catch (error) {
    logger.error("Reject greeting error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Delete greeting
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const greeting = await Greeting.findByIdAndDelete(req.params.id);

    if (!greeting) {
      return res.status(404).json({ error: "Tabrik topilmadi" });
    }

    res.json({ message: "Tabrik o'chirildi" });
  } catch (error) {
    logger.error("Delete greeting error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;
