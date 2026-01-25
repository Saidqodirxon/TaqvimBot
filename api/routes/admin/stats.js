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

    const totalUsers = await User.countDocuments().maxTimeMS(5000);
    const activeUsers = await User.countDocuments({
      is_block: false,
    }).maxTimeMS(5000);
    const blockedUsers = await User.countDocuments({
      is_block: true,
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

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    }).maxTimeMS(5000);

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        blocked: blockedUsers,
        recent: recentUsers,
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
      return res
        .status(408)
        .json({
          error:
            "Database query timeout. Ma'lumotlar bazasi sekin javob bermoqda.",
        });
    }

    if (error.message && error.message.includes("buffering")) {
      return res
        .status(503)
        .json({
          error: "Database connection issue. Iltimos qayta urinib ko'ring.",
        });
    }

    res.status(500).json({ error: "Server xatosi", details: error.message });
  }
});

// Get user growth data (last 30 days)
router.get("/growth", authMiddleware, async (req, res) => {
  try {
    if (require("mongoose").connection.readyState !== 1) {
      return res.status(503).json({ error: "Database connection not ready" });
    }

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

    res.status(500).json({ error: "Server xatosi", details: error.message });
  }
});

module.exports = router;
