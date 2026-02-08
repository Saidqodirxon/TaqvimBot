const logger = require("../../utils/logger");
const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../middleware/adminAuth");
const User = require("../../models/User");
const Settings = require("../../models/Settings");

// Get all users with pagination and search
router.get("/", authMiddleware, async (req, res) => {
  try {
    if (require("mongoose").connection.readyState !== 1) {
      return res.status(503).json({ error: "Database not connected" });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    // Build search query
    let query = {};
    if (search.trim()) {
      const searchRegex = { $regex: search, $options: "i" };
      query = {
        $or: [
          { firstName: searchRegex },
          { username: searchRegex },
          { "location.name": searchRegex },
          { phoneNumber: searchRegex },
        ],
      };

      // If search is a number, also search by userId
      if (!isNaN(search)) {
        query.$or.push({ userId: parseInt(search) });
      }
    }

    // Filter by phone number existence
    if (req.query.hasPhone === "true") {
      query.phoneNumber = { $exists: true, $ne: null };
    }

    const [total, delaySettings] = await Promise.all([
      User.countDocuments(query).maxTimeMS(5000),
      Settings.getSetting("channel_join_delay", { days: 0, hours: 0 }),
    ]);

    const delayMs =
      (delaySettings.days || 0) * 24 * 60 * 60 * 1000 +
      (delaySettings.hours || 0) * 60 * 60 * 1000;

    const usersData = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-__v")
      .lean() // Better performance for data modification
      .maxTimeMS(10000);

    const now = Date.now();
    const users = usersData.map((user) => {
      let delayRemaining = 0;
      if (user.delayStartedAt) {
        const timeSinceStart = now - new Date(user.delayStartedAt).getTime();
        delayRemaining = Math.max(0, delayMs - timeSinceStart);
      }
      return {
        ...user,
        delayRemaining,
        delayMs,
      };
    });

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get users error:", error);
    if (
      error.message &&
      (error.message.includes("timed out") ||
        error.message.includes("buffering"))
    ) {
      return res
        .status(408)
        .json({ error: "Database timeout. Qayta urinib ko'ring." });
    }
    res.status(500).json({ error: "Server xatosi", details: error.message });
  }
});
// Search users
router.get("/search", authMiddleware, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: "Query kerak" });
    }
    const users = await User.find({
      $or: [
        { firstName: { $regex: query, $options: "i" } },
        { username: { $regex: query, $options: "i" } },
        { userId: isNaN(query) ? null : parseInt(query) },
      ],
    })
      .limit(50)
      .select("-__v");
    res.json({ users });
  } catch (error) {
    logger.error("Search users error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});
// Get user by ID
router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    const [userDoc, delaySettings] = await Promise.all([
      User.findOne({ userId: parseInt(req.params.userId) }).lean(),
      Settings.getSetting("channel_join_delay", { days: 0, hours: 0 }),
    ]);

    if (!userDoc) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }

    const delayMs =
      (delaySettings.days || 0) * 24 * 60 * 60 * 1000 +
      (delaySettings.hours || 0) * 60 * 60 * 1000;

    const now = Date.now();
    let delayRemaining = 0;
    if (userDoc.delayStartedAt) {
      const timeSinceStart = now - new Date(userDoc.delayStartedAt).getTime();
      delayRemaining = Math.max(0, delayMs - timeSinceStart);
    }

    const user = {
      ...userDoc,
      delayRemaining,
      delayMs,
    };

    res.json({ user });
  } catch (error) {
    logger.error("Get user error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});
// Block/unblock user
router.patch("/:userId/block", authMiddleware, async (req, res) => {
  try {
    const { is_block } = req.body;
    const user = await User.findOneAndUpdate(
      { userId: parseInt(req.params.userId) },
      { is_block },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }
    res.json({
      message: is_block ? "Bloklandi" : "Blokdan chiqarildi",
      user,
    });
  } catch (error) {
    logger.error("Block user error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});
// Make user admin
router.patch("/:userId/admin", authMiddleware, async (req, res) => {
  try {
    const { isAdmin, role, password, username } = req.body;
    const userId = parseInt(req.params.userId);

    const user = await User.findOneAndUpdate(
      { userId },
      { isAdmin, role },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }

    // If making admin, also ensure they exist in Admin model for dashboard access
    if (isAdmin) {
      const Admin = require("../../models/Admin");
      const bcrypt = require("bcrypt");

      let adminData = {
        userId,
        username: username || user.username || `user_${userId}`,
        firstName: user.firstName,
        role: role || "moderator",
        isActive: true,
      };

      if (password) {
        adminData.password = await bcrypt.hash(password, 10);
      }

      await Admin.findOneAndUpdate({ userId }, adminData, {
        upsert: true,
        new: true,
      });
    }

    res.json({
      message: "Admin huquqi o'zgartirildi",
      user,
    });
  } catch (error) {
    logger.error("Make admin error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Send message to single user
router.post("/:userId/message", authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = parseInt(req.params.userId);

    if (!message) {
      return res.status(400).json({ error: "Xabar matni kerak" });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }

    // Send via bot
    const { Telegraf } = require("telegraf");
    const bot = new Telegraf(process.env.BOT_TOKEN);
    await bot.telegram.sendMessage(userId, message);

    await logger.logAdminAction(
      { userId: req.user?.id, firstName: "Admin" },
      "Foydalanuvchiga xabar yuborildi",
      `UserID: ${userId}`
    );

    res.json({ message: "Xabar yuborildi" });
  } catch (error) {
    logger.error("Send message error:", error);
    res.status(500).json({ error: "Xabar yuborishda xatolik" });
  }
});

// Reset user (delete and recreate on next /start)
router.delete("/:userId/reset", authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const user = await User.findOneAndDelete({ userId });

    if (!user) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }

    await logger.logAdminAction(
      { userId: req.user?.id, firstName: "Admin" },
      "Foydalanuvchi reset qilindi",
      `UserID: ${userId}, Ism: ${user.firstName}`
    );

    res.json({
      message:
        "Foydalanuvchi reset qilindi. Keyingi /start da qayta yaratiladi.",
    });
  } catch (error) {
    logger.error("Reset user error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Delete user permanently
router.delete("/:userId", authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const user = await User.findOneAndDelete({ userId });

    if (!user) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }

    await logger.logAdminAction(
      {
        userId: req.admin?.userId || req.user?.id,
        firstName: req.admin?.firstName || "Admin",
      },
      "Foydalanuvchi butunlay o'chirildi",
      `UserID: ${userId}, Ism: ${user.firstName}`
    );

    res.json({
      message: "Foydalanuvchi butunlay o'chirildi",
      user: {
        userId: user.userId,
        firstName: user.firstName,
        username: user.username,
      },
    });
  } catch (error) {
    logger.error("Delete user error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;
