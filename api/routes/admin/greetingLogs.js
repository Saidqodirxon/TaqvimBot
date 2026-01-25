const express = require("express");
const router = express.Router();
const GreetingLog = require("../../models/GreetingLog");
const { authMiddleware } = require("../../middleware/adminAuth");

/**
 * Get all greeting logs with pagination and filters
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status; // pending, approved, rejected
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;

    const total = await GreetingLog.countDocuments(filter);
    const greetings = await GreetingLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      greetings,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      stats: {
        total: await GreetingLog.countDocuments(),
        pending: await GreetingLog.countDocuments({ status: "pending" }),
        approved: await GreetingLog.countDocuments({ status: "approved" }),
        rejected: await GreetingLog.countDocuments({ status: "rejected" }),
      },
    });
  } catch (error) {
    console.error("Get greeting logs error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
