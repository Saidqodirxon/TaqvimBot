const logger = require("../../utils/logger");
const express = require("express");
const router = express.Router();
const {
  authMiddleware,
  superAdminOnly,
} = require("../../middleware/adminAuth");
const Prayer = require("../../models/Prayer");

// Get all prayers
router.get("/", authMiddleware, async (req, res) => {
  try {
    const prayers = await Prayer.find().sort({ order: 1 });
    res.json({ prayers });
  } catch (error) {
    logger.error("Get prayers error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Get single prayer
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const prayer = await Prayer.findById(req.params.id);

    if (!prayer) {
      return res.status(404).json({ error: "Dua topilmadi" });
    }

    res.json({ prayer });
  } catch (error) {
    logger.error("Get prayer error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Create prayer
router.post("/", authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const { title, content, order, isActive } = req.body;

    const prayer = new Prayer({
      title,
      content,
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    await prayer.save();

    res.json({
      message: "Dua qo'shildi",
      prayer,
    });
  } catch (error) {
    logger.error("Create prayer error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Update prayer
router.put("/:id", authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const { title, content, order, isActive } = req.body;

    const prayer = await Prayer.findByIdAndUpdate(
      req.params.id,
      {
        title,
        content,
        order,
        isActive,
      },
      { new: true }
    );

    if (!prayer) {
      return res.status(404).json({ error: "Dua topilmadi" });
    }

    res.json({
      message: "Dua yangilandi",
      prayer,
    });
  } catch (error) {
    logger.error("Update prayer error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Delete prayer
router.delete("/:id", authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const prayer = await Prayer.findByIdAndDelete(req.params.id);

    if (!prayer) {
      return res.status(404).json({ error: "Dua topilmadi" });
    }

    res.json({ message: "Dua o'chirildi" });
  } catch (error) {
    logger.error("Delete prayer error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;
