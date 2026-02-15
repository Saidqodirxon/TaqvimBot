const express = require("express");
const router = express.Router();
const Advertisement = require("../../models/Advertisement");
const { authMiddleware } = require("../../middleware/adminAuth");
const logger = require("../../utils/logger");

// Get all advertisements
router.get("/", authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [total, ads] = await Promise.all([
      Advertisement.countDocuments(),
      Advertisement.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    ]);

    res.json({
      ads,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get ads error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Create advertisement
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, type, content, image, targetRegion, isActive } = req.body;

    const ad = new Advertisement({
      title,
      type,
      content,
      image,
      targetRegion,
      isActive,
    });

    await ad.save();
    res.status(201).json(ad);
  } catch (error) {
    logger.error("Create ad error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update advertisement
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;

    const ad = await Advertisement.findByIdAndUpdate(id, update, { new: true });
    if (!ad) {
      return res.status(404).json({ error: "Advertisement not found" });
    }

    res.json(ad);
  } catch (error) {
    logger.error("Update ad error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete advertisement
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await Advertisement.findByIdAndDelete(id);
    res.json({ message: "Advertisement deleted" });
  } catch (error) {
    logger.error("Delete ad error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
