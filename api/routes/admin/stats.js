const logger = require("../../utils/logger");
const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../middleware/adminAuth");
const User = require("../../models/User");
const Greeting = require("../../models/Greeting");

// Get dashboard statistics
router.get("/", authMiddleware, async (req, res) => {
  try {
    if (require("mongoose").connection.readyState !== 1) {
      return res.status(503).json({ error: "Database connection not ready" });
    }

    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const totalUsers = await User.countDocuments().maxTimeMS(5000);
    const activeUsers = await User.countDocuments({
      is_block: false,
    }).maxTimeMS(5000);
    const blockedUsers = await User.countDocuments({
      is_block: true,
    }).maxTimeMS(5000);

    // Activity statistics
    const activeToday = await User.countDocuments({
      last_active: { $gte: last24h },
    }).maxTimeMS(5000);
    const activeLast7d = await User.countDocuments({
      last_active: { $gte: last7d },
    }).maxTimeMS(5000);

    // New users
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: last24h },
    }).maxTimeMS(5000);
    const newUsersLast7d = await User.countDocuments({
      createdAt: { $gte: last7d },
    }).maxTimeMS(5000);

    const uzUsers = await User.countDocuments({ language: "uz" }).maxTimeMS(
      5000
    );
    const crUsers = await User.countDocuments({ language: "cr" }).maxTimeMS(
      5000
    );
    const ruUsers = await User.countDocuments({ language: "ru" }).maxTimeMS(
      5000
    );
    const admins = await User.countDocuments({ isAdmin: true }).maxTimeMS(5000);
    const pendingGreetings = await Greeting.countDocuments({
      status: "pending",
    }).maxTimeMS(5000);
    const approvedGreetings = await Greeting.countDocuments({
      status: "approved",
    }).maxTimeMS(5000);
    const rejectedGreetings = await Greeting.countDocuments({
      status: "rejected",
    }).maxTimeMS(5000);

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        blocked: blockedUsers,
        activeToday,
        activeLast7d,
        newUsersToday,
        newUsersLast7d,
      },
      languages: { uz: uzUsers, cr: crUsers, ru: ruUsers },
      admins,
      greetings: {
        pending: pendingGreetings,
        approved: approvedGreetings,
        rejected: rejectedGreetings,
      },
    });
  } catch (error) {
    logger.error("Get stats error:", error);
    if (error.message && error.message.includes("timed out")) {
      return res.status(408).json({
        error:
          "Database query timeout. Ma'lumotlar bazasi sekin javob bermoqda.",
      });
    }
    if (error.message && error.message.includes("buffering")) {
      return res.status(503).json({
        error: "Database connection issue. Iltimos qayta urinib ko'ring.",
      });
    }
    res.status(500).json({ error: "Server xatosi", details: error.message });
  }
});
// Get user growth data (last 30 days)
router.get("/growth", authMiddleware, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const growth = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).maxTimeMS(10000);
    res.json({ growth });
  } catch (error) {
    logger.error("Get growth error:", error);
    if (error.message && error.message.includes("timed out")) {
      return res.status(408).json({ error: "Query timeout" });
    }
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// Get users without location count
router.get("/users-without-location", authMiddleware, async (req, res) => {
  try {
    const count = await User.countDocuments({
      $or: [
        { "location.latitude": { $exists: false } },
        { "location.latitude": null },
      ],
      isActive: { $ne: false },
    }).maxTimeMS(5000);

    res.json({ count });
  } catch (error) {
    logger.error("Get users without location error:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

module.exports = router;
