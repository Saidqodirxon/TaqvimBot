const express = require("express");
const router = express.Router();
const Suggestion = require("../../models/Suggestion");
const { authMiddleware } = require("../../middleware/adminAuth");

/**
 * Get all suggestions with pagination and filters
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status; // pending, reviewed, implemented, rejected
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;

    const total = await Suggestion.countDocuments(filter);
    const suggestions = await Suggestion.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      suggestions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      stats: {
        total: await Suggestion.countDocuments(),
        pending: await Suggestion.countDocuments({ status: "pending" }),
        reviewed: await Suggestion.countDocuments({ status: "reviewed" }),
        implemented: await Suggestion.countDocuments({ status: "implemented" }),
        rejected: await Suggestion.countDocuments({ status: "rejected" }),
      },
    });
  } catch (error) {
    console.error("Get suggestions error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update suggestion status
 */
router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    const suggestion = await Suggestion.findByIdAndUpdate(
      id,
      {
        status,
        adminNote,
        reviewedBy: req.admin.userId,
        reviewedAt: new Date(),
      },
      { new: true }
    );

    if (!suggestion) {
      return res.status(404).json({ error: "Suggestion not found" });
    }

    res.json({ message: "Suggestion updated", suggestion });
  } catch (error) {
    console.error("Update suggestion error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete suggestion
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const suggestion = await Suggestion.findByIdAndDelete(id);

    if (!suggestion) {
      return res.status(404).json({ error: "Suggestion not found" });
    }

    res.json({ message: "Suggestion deleted", suggestion });
  } catch (error) {
    console.error("Delete suggestion error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
