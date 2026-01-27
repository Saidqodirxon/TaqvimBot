const logger = require("../../utils/logger");
const express = require("express");
const router = express.Router();
const {
  authMiddleware,
  superAdminOnly,
} = require("../../middleware/adminAuth");

// Get broadcast stats
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const messageQueue = global.messageQueue;
    if (!messageQueue) {
      return res.status(500).json({ error: "Message queue not initialized" });
    }
    const stats = messageQueue.getStats();
    const estimate = messageQueue.estimateCompletion();
    res.json({
      stats,
      estimate,
    });
  } catch (error) {
    logger.error("Get broadcast stats error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});
// Get job status
router.get("/job/:jobId", authMiddleware, async (req, res) => {
  try {
    const messageQueue = global.messageQueue;
    if (!messageQueue) {
      return res.status(500).json({ error: "Message queue not initialized" });
    }
    const job = messageQueue.getJobStatus(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: "Job topilmadi" });
    }
    res.json({ job });
  } catch (error) {
    logger.error("Get job status error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});
// Send broadcast message
router.post("/send", authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const { message, filters, options } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message maydoni majburiy" });
    }
    const messageQueue = global.messageQueue;
    if (!messageQueue) {
      return res.status(500).json({ error: "Message queue not initialized" });
    }
    // Log broadcast start
    const User = require("../../models/User");
    const totalUsers = await User.countDocuments(filters || {});
    await logger.logBroadcastStart(
      { userId: req.user?.id, firstName: req.user?.firstName || "Admin" },
      filters || {},
      totalUsers
    );
    const result = await messageQueue.sendBulkMessage(
      message,
      filters,
      options || {}
    );
    res.json({
      message: "Xabar yuborish boshlandi",
      result,
    });
  } catch (error) {
    logger.error("Broadcast send error:", error);
    await logger.logError(error, "Broadcast send failed");
    res.status(500).json({ error: error.message || "Server xatosi" });
  }
});

// Send test broadcast to admin
router.post("/send-test", authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message maydoni majburiy" });
    }

    const bot = global.bot || require("../../bot");
    const adminUserId = req.user.userId;

    // Send test message to admin
    await bot.telegram.sendMessage(adminUserId, message, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📍 Joylashuvni tanlash",
              callback_data: "enter_location_scene",
            },
          ],
          [
            {
              text: "🔔 Eslatmalarni yoqish",
              callback_data: "enable_reminders_from_broadcast",
            },
          ],
          [
            {
              text: "🔄 Botni qayta ishga tushirish",
              callback_data: "restart_bot",
            },
          ],
        ],
      },
    });

    await logger.logAdminAction(
      req.user,
      "Test broadcast yuborildi",
      `AdminID: ${adminUserId}`
    );

    res.json({
      success: true,
      message: "Test xabar yuborildi!",
    });
  } catch (error) {
    logger.error("Send test broadcast error:", error);
    res.status(500).json({ error: error.message || "Server xatosi" });
  }
});

module.exports = router;
